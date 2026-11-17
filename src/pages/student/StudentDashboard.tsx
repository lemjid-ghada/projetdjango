import { useQuery } from '@tanstack/react-query';
import { BookOpen, Award, TrendingUp, Target, ArrowRight, CalendarDays, BrainCircuit, Sparkles, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router';
import { StatCard } from '../../components/ui/StatCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../api/dashboardApi';
import { apiErrorMessage } from '../../api/client';
import { useToast } from '../../components/ui/Toast';

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: dashboardApi.getStudent,
    meta: { onError: (queryError: unknown) => toast('error', apiErrorMessage(queryError)) },
  });
  const progress = data?.progress || [];
  const attempts = data?.attempts || [];
  const courses = data?.courses || [];

  const inProgress = progress.filter(p => p.percentage > 0 && p.percentage < 100);
  const avgScore = attempts.length ? Math.round(attempts.reduce((a, b) => a + b.score, 0) / attempts.length) : 0;
  const overallProgress = progress.length ? Math.round(progress.reduce((a, p) => a + p.percentage, 0) / progress.length) : 0;
  const quizPassed = attempts.filter(a => a.passed).length;

  const scoreHistory = attempts.slice(-6).map((a, i) => ({ attempt: `T${i + 1}`, score: a.score }));

  if (isLoading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>;
  if (error || !data) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger le tableau de bord.</div>;

  return (
    <div className="dashboard-page space-y-6">
      <div className="dashboard-hero dashboard-hero-student relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[35px] border-white/[0.08]" />
        <div className="pointer-events-none absolute -bottom-28 right-40 h-56 w-56 rounded-full bg-violet-300/15 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-100">
              <Target className="h-3.5 w-3.5" /> Mon espace d’apprentissage
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Bonjour, {user?.fullName?.split(' ')[0]} !</h1>
            <p className="mt-1.5 max-w-lg text-sm leading-6 text-indigo-100">Chaque étape compte. Continuez à avancer à votre rythme et célébrez vos progrès.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/student/courses')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50">
              <BookOpen className="h-4 w-4" /> Explorer les cours
            </button>
            <button type="button" onClick={() => navigate('/student/quizzes')} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20">
              Mes quiz <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="dashboard-hero-art hidden lg:grid" aria-hidden="true">
            <div className="dashboard-hero-icon"><BrainCircuit className="h-10 w-10 text-white" /></div>
            <div className="dashboard-hero-chip -left-12 top-8"><Sparkles className="h-3.5 w-3.5 text-amber-300" /> Apprendre</div>
            <div className="dashboard-hero-chip -bottom-1 -right-10"><Zap className="h-3.5 w-3.5 text-emerald-300" /> Progresser</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-indigo-100">
            <span>Progression globale</span><span className="font-bold text-white">{overallProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-indigo-950/25">
            <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/student/planner')}
          className="dashboard-action mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/25"
        >
          <CalendarDays className="h-4 w-4" />
          Créer mon planning de révision
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Cours en cours" value={inProgress.length} icon={BookOpen} color="indigo" />
        <StatCard title="Quiz réussis" value={quizPassed} icon={Award} color="emerald" />
        <StatCard title="Score moyen" value={`${avgScore}%`} icon={TrendingUp} color="amber" />
        <StatCard title="Progression" value={`${overallProgress}%`} icon={Target} color="blue" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="dashboard-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Continuer l'apprentissage</h2>
            <button onClick={() => navigate('/student/courses')} className="text-xs text-indigo-600 flex items-center gap-1 hover:underline">
              Tous les cours <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-4">
            {inProgress.slice(0, 3).map(p => (
              <button type="button" key={p.courseId} className="dashboard-row group w-full cursor-pointer rounded-xl p-2 text-left" onClick={() => navigate(`/student/courses/${p.courseId}`)}>
                <div className="flex justify-between mb-1.5">
                  <p className="text-xs font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate max-w-[200px]">{p.courseTitle}</p>
                  <span className="text-[10px] text-slate-500">{p.completedLessons}/{p.totalLessons} leçons</span>
                </div>
                <ProgressBar value={p.percentage} showPercent={false} size="sm" />
              </button>
            ))}
            {inProgress.length === 0 && (
              <div className="text-center py-6">
                <p className="text-xs text-slate-400">Inscrivez-vous à un cours pour commencer</p>
                <button onClick={() => navigate('/student/courses')} className="mt-2 text-xs text-indigo-600 hover:underline">Découvrir les cours</button>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Évolution des scores</h2>
          {scoreHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={scoreHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="attempt" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2.5} dot={{ fill: '#4F46E5', r: 4 }} name="Score %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-slate-400">Passez des quiz pour voir votre évolution</div>
          )}
        </div>
      </div>

      <div className="dashboard-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Quiz disponibles</h2>
          <button onClick={() => navigate('/student/quizzes')} className="text-xs text-indigo-600 flex items-center gap-1 hover:underline">
            Voir tous <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {courses.slice(0, 2).map(c => (
            <div key={c.id} onClick={() => navigate('/student/quizzes')} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <img src={c.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-200" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{c.title}</p>
                <p className="text-[10px] text-slate-500">{c.lessons.length} questions disponibles</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
