import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, BarChart2, FileQuestion, ShieldCheck, Clock3, Users, CircleCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { quizzesApi } from '../../api/quizzesApi';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import type { Quiz } from '../../types';
import type { QuizDraft } from '../../api/quizzesApi';
import { QuizForm } from './QuizForm';
import { QuizResults } from './QuizResults';
import { apiErrorMessage } from '../../api/client';

export function TeacherQuizzes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [deleting, setDeleting] = useState<Quiz | null>(null);
  const [resultsQuiz, setResultsQuiz] = useState<Quiz | null>(null);

  const { data: quizzes = [], isLoading, error } = useQuery({ queryKey: ['teacher-quizzes', user?.id], queryFn: () => quizzesApi.getByTeacher(user!.id) });
  const totalAttempts = quizzes.reduce((total, quiz) => total + quiz.attemptCount, 0);
  const openQuizzes = quizzes.filter(quiz => quiz.status !== 'closed').length;
  const deleteMut = useMutation({ mutationFn: (id: number) => quizzesApi.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-quizzes'] }); toast('success', 'Quiz supprimé'); setDeleting(null); }, onError: error => toast('error', apiErrorMessage(error)) });

  useEffect(() => {
    const navigationDraft = (location.state as { quizDraft?: QuizDraft } | null)?.quizDraft;
    if (navigationDraft) {
      setDraft(navigationDraft);
      setEditing(null);
      setModalOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  return (
    <div className="dashboard-page space-y-6">
      <div className="dashboard-hero dashboard-hero-teacher relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[35px] border-white/[0.05]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-100">
              <ShieldCheck className="h-3.5 w-3.5" /> Évaluation & suivi
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Vos quiz, en un seul endroit</h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-indigo-100/80">Créez des évaluations, consultez les résultats et suivez les tentatives de vos étudiants.</p>
          </div>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="dashboard-action inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-indigo-900 shadow-sm transition hover:bg-indigo-50">
            <Plus className="h-4 w-4" /> Créer un quiz
          </button>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-white/10 pt-4 text-xs text-indigo-100/80">
          <span className="inline-flex items-center gap-2"><FileQuestion className="h-3.5 w-3.5" /><strong className="text-white">{quizzes.length}</strong> quiz créés</span>
          <span className="inline-flex items-center gap-2"><CircleCheck className="h-3.5 w-3.5 text-emerald-300" /><strong className="text-white">{openQuizzes}</strong> ouverts</span>
          <span className="inline-flex items-center gap-2"><Users className="h-3.5 w-3.5" /><strong className="text-white">{totalAttempts}</strong> tentatives</span>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger vos quiz.</div>
      ) : isLoading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>
      ) : quizzes.length === 0 ? (
        <EmptyState icon={Plus} title="Aucun quiz" description="Créez votre premier quiz pour évaluer vos étudiants." action={<button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl">Créer un quiz</button>} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {quizzes.map(q => (
            <article key={q.id} className="dashboard-panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 dark:from-indigo-950 dark:to-violet-950 dark:text-indigo-300">
                <FileQuestion className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{q.title}</h3>
                    <p className="mt-1 truncate text-xs text-slate-500">{q.courseName}</p>
                  </div>
                  <Badge variant={q.status === 'closed' ? 'slate' : 'emerald'}>{q.status === 'closed' ? 'Fermé' : 'Ouvert'}</Badge>
                </div>
              </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-y border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 text-[10px] text-slate-500"><FileQuestion className="h-3.5 w-3.5 text-indigo-500" /><strong className="text-slate-700 dark:text-slate-200">{q.questions.length}</strong> questions</div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500"><Clock3 className="h-3.5 w-3.5 text-amber-500" /><strong className="text-slate-700 dark:text-slate-200">{q.duration}</strong> min</div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500"><Users className="h-3.5 w-3.5 text-emerald-500" /><strong className="text-slate-700 dark:text-slate-200">{q.attemptCount}</strong> tentatives</div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Seuil {q.passingScore}%</span>
                  <span className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">{q.allowMultipleAttempts ? 'Tentatives multiples' : 'Une tentative'}</span>
                  {q.strictMode && <span className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300"><ShieldCheck className="mr-1 inline h-3 w-3" />Mode strict</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setResultsQuiz(q)} aria-label={`Voir les résultats de ${q.title}`} className="dashboard-action inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <BarChart2 className="h-3.5 w-3.5" /> Résultats
                  </button>
                  <button onClick={() => { setEditing(q); setModalOpen(true); }} aria-label={`Modifier ${q.title}`} className="dashboard-action rounded-lg p-2 text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleting(q)} aria-label={`Supprimer ${q.title}`} className="dashboard-action rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); setDraft(null); }} title={editing ? 'Modifier le quiz' : 'Créer un quiz'} size="xl">
        <QuizForm
          initial={editing}
          initialDraft={draft}
          teacherId={user!.id}
          onSuccess={async (data) => {
            try {
              if (editing) await quizzesApi.update(editing.id, data);
              else await quizzesApi.create(data);
              qc.invalidateQueries({ queryKey: ['teacher-quizzes'] });
              qc.invalidateQueries({ queryKey: ['teacher-dashboard'] });
              toast('success', editing ? 'Quiz modifié' : 'Quiz créé');
              setModalOpen(false); setEditing(null); setDraft(null);
            } catch (error) {
              toast('error', apiErrorMessage(error));
            }
          }}
          onCancel={() => { setModalOpen(false); setEditing(null); setDraft(null); }}
        />
      </Modal>

      <Modal open={!!resultsQuiz} onClose={() => setResultsQuiz(null)} title={`Résultats: ${resultsQuiz?.title}`} size="lg">
        {resultsQuiz && <QuizResults quiz={resultsQuiz} />}
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} title="Supprimer le quiz" message={`Supprimer "${deleting?.title}" ?`} confirmLabel="Supprimer" loading={deleteMut.isPending} />
    </div>
  );
}
