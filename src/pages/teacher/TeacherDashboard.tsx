import { useQuery } from '@tanstack/react-query';
import { BookOpen, FileQuestion, Users, TrendingUp, ArrowRight, Plus, Sparkles, GraduationCap, CirclePlay } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router';
import { StatCard } from '../../components/ui/StatCard';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../api/dashboardApi';
import { apiErrorMessage } from '../../api/client';
import { useToast } from '../../components/ui/Toast';

export function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: dashboardApi.getTeacher,
    meta: { onError: (queryError: unknown) => toast('error', apiErrorMessage(queryError)) },
  });
  const courses = data?.courses || [];
  const quizzes = data?.quizzes || [];
  const attempts = data?.attempts || [];

  const totalEnrolled = courses.reduce((a, c) => a + c.enrolledCount, 0);
  const avgScore = attempts.length ? Math.round(attempts.reduce((a, b) => a + b.score, 0) / attempts.length) : 0;

  const chartData = courses.map(c => ({ name: c.title.substring(0, 20) + '...', étudiants: c.enrolledCount }));

  if (isLoading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i) => <CardSkeleton key={i} />)}</div>;
  if (error || !data) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger le tableau de bord.</div>;

  return (
    <div className="dashboard-page space-y-6">
      <div className="dashboard-hero dashboard-hero-teacher relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[35px] border-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-28 right-40 h-56 w-56 rounded-full bg-violet-400/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-100">
              <Sparkles className="h-3.5 w-3.5" /> Espace enseignant
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Bonjour, {user?.fullName?.split(' ')[0]} !</h1>
            <p className="mt-1.5 max-w-lg text-sm leading-6 text-indigo-100/80">Retrouvez ici l’activité de vos cours et accompagnez la progression de vos étudiants.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/teacher/courses')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-indigo-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50">
              <Plus className="h-4 w-4" /> Gérer mes cours
            </button>
            <button type="button" onClick={() => navigate('/teacher/quizzes')} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15">
              Mes quiz <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="dashboard-hero-art hidden lg:grid" aria-hidden="true">
            <div className="dashboard-hero-icon"><GraduationCap className="h-10 w-10 text-white" /></div>
            <div className="dashboard-hero-chip -left-12 top-8"><Users className="h-3.5 w-3.5 text-sky-300" /> Vos étudiants</div>
            <div className="dashboard-hero-chip -bottom-1 -right-10"><CirclePlay className="h-3.5 w-3.5 text-emerald-300" /> Vos cours</div>
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-4 text-xs text-indigo-100/80">
          <span><strong className="mr-1 text-white">{courses.length}</strong> cours publiés</span>
          <span><strong className="mr-1 text-white">{totalEnrolled}</strong> inscriptions</span>
          <span><strong className="mr-1 text-white">{quizzes.length}</strong> quiz créés</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Mes cours" value={courses.length} icon={BookOpen} color="indigo" />
        <StatCard title="Mes quiz" value={quizzes.length} icon={FileQuestion} color="purple" />
        <StatCard title="Étudiants inscrits" value={totalEnrolled} icon={Users} color="emerald" change="+5% ce mois" changeType="up" />
        <StatCard title="Score moyen" value={`${avgScore}%`} icon={TrendingUp} color="amber" />
      </div>

      <div className="dashboard-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Inscriptions par cours</h2>
            <p className="mt-1 text-xs text-slate-400">Comparez l’engagement sur vos formations</p>
          </div>
          <span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">Vue d’ensemble</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94A3B8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
            <Bar dataKey="étudiants" fill="#4F46E5" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="dashboard-panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Mes cours récents</h2>
            <button type="button" onClick={() => navigate('/teacher/courses')} className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
              Tout voir <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {courses.slice(0,4).map(c => (
              <button type="button" key={c.id} onClick={() => navigate('/teacher/courses')} className="dashboard-row flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <img src={c.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-200" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{c.title}</p>
                  <p className="text-[10px] text-slate-500">{c.enrolledCount} étudiants · {c.lessons.length} leçons</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5" />
              </button>
            ))}
            {courses.length === 0 && <p className="px-5 py-8 text-center text-xs text-slate-400">Aucun cours pour le moment.</p>}
          </div>
        </div>

        <div className="dashboard-panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Mes quiz</h2>
            <button type="button" onClick={() => navigate('/teacher/quizzes')} className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
              Tout voir <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {quizzes.map(q => (
              <button type="button" key={q.id} onClick={() => navigate('/teacher/quizzes')} className="dashboard-row flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center">
                  <FileQuestion className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{q.title}</p>
                  <p className="text-[10px] text-slate-500">{q.attemptCount} tentatives · {q.questions.length} questions</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
              </button>
            ))}
            {quizzes.length === 0 && <p className="px-5 py-8 text-center text-xs text-slate-400">Aucun quiz créé pour le moment.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
