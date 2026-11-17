import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3, FileQuestion, Sparkles } from 'lucide-react';
import { chatbotApi, type StudyPlan } from '../../api/chatbotApi';
import { apiErrorMessage } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import { paymentApi } from '../../api/paymentApi';
import { useAuth } from '../../context/AuthContext';

function formatWeekRange(days: StudyPlan['days']) {
  if (!days.length) return '';
  const start = new Date(`${days[0].date}T12:00:00`);
  const end = new Date(`${days[days.length - 1].date}T12:00:00`);
  const startLabel = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(start);
  const endLabel = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(end);
  return `${startLabel} – ${endLabel}`;
}

export function StudentPlanner() {
  const [minutesPerDay, setMinutesPerDay] = useState(60);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isPremium } = useAuth();
  const queryClient = useQueryClient();
  const { data: premiumStatus } = useQuery({
    queryKey: ['premium-status'],
    queryFn: paymentApi.getPremiumStatus,
    enabled: user?.role === 'ETUDIANT',
  });
  const aiQuotaExhausted = !isPremium && premiumStatus?.ai_usage.remaining === 0;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const plannerMutation = useMutation({
    mutationFn: chatbotApi.generateStudyPlan,
    onSuccess: generatedPlan => {
      setPlan(generatedPlan);
      setErrorMessage(null);
      void queryClient.invalidateQueries({ queryKey: ['premium-status'] });
      toast('success', 'Votre planning de révision est prêt.');
    },
    onError: error => {
      const message = apiErrorMessage(error, 'Impossible de créer le planning.');
      setErrorMessage(message);
      toast('error', message);
    },
  });

  const createPlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (aiQuotaExhausted) {
      window.dispatchEvent(new Event('open-premium-modal'));
      return;
    }
    plannerMutation.mutate(minutesPerDay);
  };

  const openTask = (task: StudyPlan['days'][number]['tasks'][number]) => {
    if (task.type === 'lesson') {
      navigate(`/student/courses/${task.courseId}`);
    } else {
      navigate(`/student/quizzes?quizId=${task.taskId.slice('quiz:'.length)}`);
    }
  };

  return (
    <div className="dashboard-page mx-auto max-w-7xl space-y-6">
      <header className="dashboard-hero dashboard-hero-student relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[35px] border-white/[0.08]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-white/15 bg-white/15 p-3.5 shadow-lg shadow-indigo-950/10">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-200">
              <Sparkles className="h-4 w-4" /> Assistant IA
            </p>
            <h1 className="mt-1 text-2xl font-bold">Mon planning de révision</h1>
            <p className="mt-2 max-w-2xl text-sm text-violet-100">
              Votre semaine de révision en un coup d’œil. Choisissez votre temps disponible et laissez l’IA organiser vos leçons et quiz.
            </p>
          </div>
          </div>
          {plan && (
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-100">Semaine planifiée</p>
              <p className="mt-1 text-sm font-bold capitalize">{formatWeekRange(plan.days)}</p>
            </div>
          )}
        </div>
      </header>

      <form
        onSubmit={createPlan}
        className="dashboard-panel flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-end"
      >
        <label className="flex-1">
          <span className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
            Temps disponible chaque jour
          </span>
          <span className="relative block">
            <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              min={15}
              max={480}
              step={15}
              required
              value={minutesPerDay}
              onChange={event => setMinutesPerDay(Number(event.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-16 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-violet-950"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              minutes/jour
            </span>
          </span>
          <span className="mt-1 block text-[11px] text-slate-400">De 15 minutes à 8 heures.</span>
        </label>
        <button
          type="submit"
          disabled={plannerMutation.isPending || minutesPerDay < 15 || minutesPerDay > 480}
          className="dashboard-action flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
        >
          {plannerMutation.isPending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Création du planning...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {aiQuotaExhausted ? 'Débloquer Premium' : plan ? 'Actualiser mon planning' : 'Créer mon planning'}
            </>
          )}
        </button>
      </form>

      {errorMessage && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage}
        </p>
      )}

      {plan && (
        <section aria-label="Calendrier de révision" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Calendrier de révision</h2>
                <p className="mt-0.5 text-xs capitalize text-slate-500 dark:text-slate-400">{formatWeekRange(plan.days)} · {plan.minutesPerDay} min disponibles par jour</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {plan.days.reduce((total, day) => total + day.tasks.length, 0)} tâches planifiées
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
            {plan.days.map((day, index) => {
              const date = new Date(`${day.date}T12:00:00`);
              const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '');
              const dayNumber = new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(date);
              const isToday = day.date === todayKey;
              const usage = Math.min(100, Math.round(day.totalMinutes / plan.minutesPerDay * 100));
              return (
                <article key={day.date} className={`dashboard-panel min-h-52 overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-900 ${isToday ? 'border-violet-300 ring-2 ring-violet-100 dark:border-violet-700 dark:ring-violet-950' : 'border-slate-200/80 dark:border-slate-800'}`}>
                  <div className={`border-b px-3.5 py-3 ${isToday ? 'border-violet-100 bg-violet-50/80 dark:border-violet-900/60 dark:bg-violet-950/30' : 'border-slate-100 dark:border-slate-800'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-9 w-9 flex-col items-center justify-center rounded-xl text-[9px] font-bold uppercase leading-3 ${isToday ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                          <span>{weekday}</span><span className="text-sm">{dayNumber}</span>
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">J{index + 1}</span>
                      </div>
                      {isToday && <span className="rounded-full bg-violet-600 px-2 py-1 text-[9px] font-bold text-white">Aujourd’hui</span>}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{day.totalMinutes} min</span>
                      <span className="text-slate-400">/ {plan.minutesPerDay} min</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={`h-full rounded-full transition-all duration-700 ${usage >= 90 ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${usage}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2 p-2.5">
                    {day.tasks.length === 0 ? (
                      <div className="flex min-h-20 flex-col items-center justify-center gap-1 text-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <p className="text-[10px] leading-4 text-slate-400">Pause ou rattrapage</p>
                      </div>
                    ) : day.tasks.map(task => {
                    const TaskIcon = task.type === 'lesson' ? BookOpen : FileQuestion;
                    return (
                      <button
                        type="button"
                        key={task.taskId}
                        onClick={() => openTask(task)}
                        className={`group/task flex w-full items-start gap-2 rounded-xl border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md ${task.type === 'lesson' ? 'border-indigo-100 bg-indigo-50/70 hover:border-indigo-200 dark:border-indigo-900/60 dark:bg-indigo-950/30' : 'border-amber-100 bg-amber-50/70 hover:border-amber-200 dark:border-amber-900/60 dark:bg-amber-950/30'}`}
                      >
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${task.type === 'lesson' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                          <TaskIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[10px] font-bold leading-4 text-slate-800 dark:text-slate-100">{task.title}</p>
                          <p className="mt-1 truncate text-[9px] text-slate-500 dark:text-slate-400">{task.courseTitle}</p>
                          <div className="mt-1.5 flex items-center justify-between gap-1">
                            <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">{task.minutes} min</span>
                            <ArrowRight className="h-3 w-3 text-slate-400 transition-transform group-hover/task:translate-x-0.5" />
                          </div>
                        </div>
                      </button>
                    );
                  })
                  }
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
