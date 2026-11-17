import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, FileQuestion, AlertCircle, UserCheck, ArrowRight, ShieldCheck, Sparkles, Activity, LockKeyhole } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router';
import { StatCard } from '../../components/ui/StatCard';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { dashboardApi } from '../../api/dashboardApi';
import { apiErrorMessage } from '../../api/client';
import { useToast } from '../../components/ui/Toast';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B'];

export function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: dashboardApi.getAdmin,
    meta: { onError: (queryError: unknown) => toast('error', apiErrorMessage(queryError)) },
  });
  const stats = data?.stats;
  const recentComplaints = data?.recentComplaints || [];

  if (isLoading) return <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i) => <CardSkeleton key={i} />)}</div>;
  if (error || !stats) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger le tableau de bord.</div>;

  return (
    <div className="dashboard-page space-y-6">
      <div className="dashboard-hero dashboard-hero-admin relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[35px] border-white/[0.04]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-100">
              <ShieldCheck className="h-3.5 w-3.5" /> Centre de pilotage
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Vue d’ensemble</h1>
            <p className="mt-1.5 max-w-lg text-sm leading-6 text-slate-300">Suivez la santé de la plateforme et gérez les comptes en un seul endroit.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/admin/users')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-indigo-50">
              <Users className="h-4 w-4" /> Gérer les utilisateurs
            </button>
            <button type="button" onClick={() => navigate('/admin/complaints')} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15">
              Réclamations <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="dashboard-hero-art hidden lg:grid" aria-hidden="true">
            <div className="dashboard-hero-icon"><ShieldCheck className="h-10 w-10 text-white" /></div>
            <div className="dashboard-hero-chip -left-12 top-8"><Activity className="h-3.5 w-3.5 text-emerald-300" /> Plateforme active</div>
            <div className="dashboard-hero-chip -bottom-1 -right-10"><LockKeyhole className="h-3.5 w-3.5 text-sky-300" /> Espace sécurisé</div>
          </div>
        </div>
        <div className="relative mt-6 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>Activité de la plateforme, actualisée à partir des données disponibles.</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total utilisateurs" value={stats!.totalUsers} icon={Users} color="indigo" change="+12% ce mois" changeType="up" />
        <StatCard title="Enseignants" value={stats!.totalTeachers} icon={UserCheck} color="emerald" />
        <StatCard title="Étudiants" value={stats!.totalStudents} icon={Users} color="blue" change="+8%" changeType="up" />
        <StatCard title="Cours" value={stats!.totalCourses} icon={BookOpen} color="purple" />
        <StatCard title="Quiz" value={stats!.totalQuizzes} icon={FileQuestion} color="amber" />
        <StatCard title="Réclamations ouvertes" value={stats!.openComplaints} icon={AlertCircle} color="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="dashboard-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Nouveaux utilisateurs par mois</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats!.newUsersPerMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
              <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2.5} dot={{ fill: '#4F46E5', r: 4 }} name="Inscriptions" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Répartition par rôle</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats!.usersByRole} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {stats!.usersByRole.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Réclamations récentes</h2>
            <p className="mt-1 text-[10px] text-slate-400">Les demandes les plus récentes de la communauté</p>
          </div>
          <button type="button" onClick={() => navigate('/admin/complaints')} className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            Tout voir <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {recentComplaints.map(c => (
            <button key={c.id} type="button" onClick={() => navigate('/admin/complaints')} className="dashboard-row flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{c.subject}</p>
                <p className="text-[10px] text-slate-500">{c.authorName} · {c.authorRole}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                c.status === 'Open' ? 'bg-red-50 text-red-600' :
                c.status === 'In progress' ? 'bg-amber-50 text-amber-600' :
                'bg-emerald-50 text-emerald-600'
              }`}>{c.status}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
            </button>
          ))}
          {recentComplaints.length === 0 && <p className="px-5 py-8 text-center text-xs text-slate-400">Aucune réclamation récente.</p>}
        </div>
      </div>
    </div>
  );
}
