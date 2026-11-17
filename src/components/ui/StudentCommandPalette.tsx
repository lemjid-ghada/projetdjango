import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Command, LoaderCircle, Search, Sparkles, Crown } from 'lucide-react';
import { useNavigate } from 'react-router';
import { chatbotApi, type StudentCommandResult } from '../../api/chatbotApi';
import { apiErrorMessage } from '../../api/client';
import { useToast } from './Toast';
import { paymentApi } from '../../api/paymentApi';
import { useAuth } from '../../context/AuthContext';

interface StudentCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const suggestions = [
  'Montre-moi mes cours de Python',
  'Quel est mon prochain quiz ?',
  'Résume-moi mon dernier cours',
];

export function StudentCommandPalette({
  open,
  onOpenChange,
}: StudentCommandPaletteProps) {
  const [command, setCommand] = useState('');
  const [result, setResult] = useState<StudentCommandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPremium } = useAuth();
  const queryClient = useQueryClient();
  const { data: premiumStatus } = useQuery({
    queryKey: ['premium-status'],
    queryFn: paymentApi.getPremiumStatus,
    enabled: open,
  });
  const aiQuotaExhausted = !isPremium && premiumStatus?.ai_usage.remaining === 0;

  useEffect(() => {
    if (!open) return;
    setCommand('');
    setResult(null);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const submitCommand = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    if (aiQuotaExhausted) {
      onOpenChange(false);
      window.dispatchEvent(new Event('open-premium-modal'));
      return;
    }

    setCommand(trimmed);
    setLoading(true);
    setResult(null);
    try {
      const response = await chatbotApi.runStudentCommand(trimmed);
      void queryClient.invalidateQueries({ queryKey: ['premium-status'] });
      setResult(response);
      if (response.action === 'show_courses') {
        onOpenChange(false);
        navigate('/student/courses');
      } else if (response.action === 'show_quizzes') {
        onOpenChange(false);
        navigate('/student/quizzes');
      } else if (response.action === 'open_course' && response.targetId) {
        onOpenChange(false);
        navigate(`/student/courses/${response.targetId}`);
      } else if (
        (response.action === 'open_quiz' || response.action === 'next_quiz') &&
        response.targetId
      ) {
        onOpenChange(false);
        navigate(`/student/quizzes?quizId=${response.targetId}`);
      }
    } catch (error) {
      toast('error', apiErrorMessage(error, 'Impossible de traiter la commande.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitCommand(command);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/50 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-command-title"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <Search className="h-5 w-5 shrink-0 text-violet-500" />
          <label id="student-command-title" className="sr-only">
            Raccourci IA étudiant
          </label>
          <input
            ref={inputRef}
            value={command}
            onChange={event => setCommand(event.target.value)}
            placeholder="Que souhaitez-vous faire ?"
            maxLength={500}
            aria-label="Décrivez votre commande"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />
          <kbd className="hidden items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-400 sm:inline-flex dark:border-slate-700">
            <Command className="h-3 w-3" /> K
          </kbd>
          <button
            type="submit"
            disabled={loading || !command.trim() || aiQuotaExhausted}
            aria-label="Exécuter la commande"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
          </button>
        </form>

        <div className="p-5">
          {aiQuotaExhausted && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
              <p className="text-xs text-amber-800 dark:text-amber-200">Vos 3 requêtes IA gratuites sont utilisées ce mois-ci.</p>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  window.dispatchEvent(new Event('open-premium-modal'));
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600"
              >
                <Crown className="h-4 w-4" /> Débloquer Premium
              </button>
            </div>
          )}
          {loading ? (
            <div className="flex items-center gap-3 py-5 text-sm text-violet-700 dark:text-violet-300" role="status">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              L’IA analyse votre demande...
            </div>
          ) : result?.action === 'summarize_course' && result.summary ? (
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/40">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                <Sparkles className="h-4 w-4" />
                Résumé · {result.title}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {result.summary}
              </p>
            </div>
          ) : result ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200" role="status">
              {result.message}
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Essayez par exemple
              </p>
              <div className="flex flex-col gap-2">
                {suggestions.map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setCommand(suggestion);
                      void submitCommand(suggestion);
                    }}
                    className="rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-violet-50 hover:text-violet-800 dark:text-slate-300 dark:hover:bg-violet-950/50 dark:hover:text-violet-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-800">
          <span>Le raccourci IA agit uniquement sur vos cours et quiz accessibles.</span>
          <button type="button" onClick={() => onOpenChange(false)} className="font-semibold hover:text-slate-600 dark:hover:text-slate-200">
            Échap pour fermer
          </button>
        </footer>
      </section>
    </div>
  );
}
