import { NavLink, useNavigate } from 'react-router';
import {
  LayoutDashboard, Users, BookOpen, FileQuestion, MessageSquare,
  AlertCircle, TrendingUp, User, X, GraduationCap, ChevronRight, CalendarDays,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const adminLinks = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { to: '/admin/complaints', icon: AlertCircle, label: 'Réclamations' },
  { to: '/admin/profile', icon: User, label: 'Mon profil' },
];

const teacherLinks = [
  { to: '/teacher/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/teacher/courses', icon: BookOpen, label: 'Mes cours' },
  { to: '/teacher/quizzes', icon: FileQuestion, label: 'Mes quiz' },
  { to: '/teacher/chatbot', icon: MessageSquare, label: 'Chatbot IA' },
  { to: '/teacher/complaints', icon: AlertCircle, label: 'Réclamations' },
  { to: '/profile', icon: User, label: 'Mon profil' },
];

const studentLinks = [
  { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/student/courses', icon: BookOpen, label: 'Cours' },
  { to: '/student/quizzes', icon: FileQuestion, label: 'Quiz' },
  { to: '/student/planner', icon: CalendarDays, label: 'Planning IA' },
  { to: '/student/progress', icon: TrendingUp, label: 'Ma progression' },
  { to: '/student/chatbot', icon: MessageSquare, label: 'Chatbot IA' },
  { to: '/student/complaints', icon: AlertCircle, label: 'Réclamations' },
  { to: '/student/profile', icon: User, label: 'Mon profil' },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const links = user?.role === 'ADMIN' ? adminLinks : user?.role === 'ENSEIGNANT' ? teacherLinks : studentLinks;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`
        fixed left-0 top-0 z-30 flex h-full w-64 flex-col
        border-r border-slate-200/80 bg-white/95 shadow-xl shadow-slate-900/5 backdrop-blur-xl
        transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/10
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800">
          <button
            onClick={() => navigate(user?.role === 'ADMIN' ? '/admin/dashboard' : user?.role === 'ENSEIGNANT' ? '/teacher/dashboard' : '/student/dashboard')}
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-600/20 transition-transform group-hover:rotate-[-5deg] group-hover:scale-105">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">EduLearn</span>
          </button>
          <button
            onClick={onClose}
            aria-label="Fermer le menu"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-4 mt-5 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/70">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {user?.role === 'ADMIN' ? 'Espace administration' : user?.role === 'ENSEIGNANT' ? 'Espace enseignant' : 'Espace étudiant'}
          </span>
        </div>

        <nav aria-label="Navigation principale" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Menu principal
          </p>
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `
                group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 shadow-sm shadow-indigo-900/5 dark:from-indigo-950/80 dark:to-violet-950/50 dark:text-indigo-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white'}
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-indigo-600 dark:bg-indigo-400" />}
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${isActive ? 'bg-white/80 text-indigo-600 shadow-sm dark:bg-slate-900/70 dark:text-indigo-300' : 'bg-transparent text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`}>
                    <Icon className="h-4 w-4 shrink-0" />
                  </span>
                  <span className="flex-1">{label}</span>
                  <ChevronRight className={`h-3.5 w-3.5 transition-all ${isActive ? 'translate-x-0 text-indigo-500' : '-translate-x-1 text-slate-300 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 dark:text-slate-600'}`} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {user?.role === 'ETUDIANT' && (
          <button
            type="button"
            onClick={() => navigate('/student/planner')}
            className="mx-4 mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-3.5 text-left text-white shadow-lg shadow-indigo-600/15 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold">Planifier mes révisions</span>
              <span className="mt-0.5 block text-[10px] text-indigo-100">Créer mon planning IA</span>
            </span>
            <ChevronRight className="h-4 w-4 text-white/70" />
          </button>
        )}

        {user && (
          <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            <div className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/70">
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=4F46E5&color=fff`}
                alt={user.fullName}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-700"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{user.fullName}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
