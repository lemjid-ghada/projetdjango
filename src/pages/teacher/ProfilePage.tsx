import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Save, ShieldCheck, GraduationCap, UserRound, KeyRound, BadgeCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { authApi } from '../../api/authApi';
import { apiErrorMessage } from '../../api/client';

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  bio: z.string().optional(),
});

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const avatarInput = useRef<HTMLInputElement>(null);
  const isAdmin = user?.role === 'ADMIN';
  const isStudent = user?.role === 'ETUDIANT';
  const roleLabel = isAdmin ? 'Administrateur' : isStudent ? 'Étudiant' : 'Enseignant';
  const roleHeroClass = isAdmin ? 'dashboard-hero-admin' : isStudent ? 'dashboard-hero-student' : 'dashboard-hero-teacher';
  const profileIcon = isAdmin ? ShieldCheck : isStudent ? GraduationCap : UserRound;
  const ProfileIcon = profileIcon;
  const joinedDate = user?.createdAt
    ? new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(user.createdAt))
    : null;

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: user?.fullName || '', email: user?.email || '', bio: user?.bio || '' },
  });

  const onSubmit = async (data: { fullName: string; email: string; bio?: string }) => {
    try {
      const updated = await authApi.updateProfile(data);
      updateUser(updated);
      toast('success', 'Profil mis à jour');
    } catch (error) {
      toast('error', apiErrorMessage(error));
    }
  };

  const onAvatarChange = async (file?: File) => {
    if (!file) return;
    try {
      updateUser(await authApi.updateAvatar(file));
      toast('success', 'Photo de profil mise à jour');
    } catch (error) {
      toast('error', apiErrorMessage(error));
    }
  };

  return (
    <div className="dashboard-page mx-auto max-w-6xl space-y-6">
      <header className={`dashboard-hero relative overflow-hidden rounded-3xl p-6 text-white sm:p-8 ${roleHeroClass}`}>
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[35px] border-white/[0.05]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || '')}&background=4F46E5&color=fff&size=128`}
              alt={user?.fullName}
              className="h-24 w-24 rounded-3xl border-4 border-white/25 object-cover shadow-xl shadow-slate-950/20"
            />
            <button type="button" onClick={() => avatarInput.current?.click()} aria-label="Modifier la photo de profil" className="dashboard-action absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-indigo-950 bg-white text-indigo-700 shadow-lg transition hover:bg-indigo-50">
              <Camera className="h-4 w-4" />
            </button>
            <input ref={avatarInput} type="file" accept="image/png,image/jpeg" className="hidden" onChange={event => void onAvatarChange(event.target.files?.[0])} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-100">
              <ProfileIcon className="h-3.5 w-3.5" /> Espace {roleLabel.toLowerCase()}
            </div>
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{user?.fullName}</h1>
            <p className="mt-1 text-sm text-indigo-100/80">{user?.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-white">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" /> {roleLabel}
              </span>
              {joinedDate && <span className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[10px] text-indigo-100">Membre depuis {joinedDate}</span>}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="dashboard-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Paramètres du compte</h2>
          <p className="mt-1 text-xs text-slate-500">Mettez à jour vos informations et protégez votre compte.</p>
        </div>

        <div className="mb-5 inline-flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {(['profile', 'password'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all ${activeTab === t ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500'}`}>
              {t === 'profile' ? <><UserRound className="h-3.5 w-3.5" /> Profil</> : <><KeyRound className="h-3.5 w-3.5" /> Sécurité</>}
            </button>
          ))}
        </div>

        {activeTab === 'profile' ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nom complet</label>
                <input {...register('fullName')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Email</label>
                <input {...register('email')} type="email" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Bio</label>
              <textarea {...register('bio')} rows={4} placeholder="Présentez-vous en quelques mots..." className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
            <button type="submit" disabled={isSubmitting} className="dashboard-action flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60">
              <Save className="w-4 h-4" /> {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </form>
        ) : (
          <PasswordForm />
        )}
      </section>

      <aside className="space-y-4">
        <div className="dashboard-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">Compte sécurisé</h3>
          <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">Gardez vos informations à jour et choisissez un mot de passe robuste.</p>
          <button type="button" onClick={() => setActiveTab('password')} className="dashboard-action mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-indigo-950 dark:hover:text-indigo-300">
            <KeyRound className="h-3.5 w-3.5" /> Modifier le mot de passe
          </button>
        </div>
        <div className="dashboard-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
            <ProfileIcon className="h-4 w-4 text-indigo-500" /> Votre espace
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {isAdmin ? 'Gérez la plateforme et accompagnez la communauté EduLearn.' : isStudent ? 'Retrouvez vos cours, quiz et outils de révision depuis votre espace étudiant.' : 'Créez des cours et des évaluations pour accompagner vos étudiants.'}
          </p>
        </div>
      </aside>
      </div>
    </div>
  );
}

function PasswordForm() {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setError, formState: { isSubmitting, errors } } = useForm<{ current: string; next: string; confirm: string }>();
  const onSubmit = async (data: { current: string; next: string; confirm: string }) => {
    if (data.next !== data.confirm) {
      setError('confirm', { message: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    try {
      await authApi.changePassword(data.current, data.next);
      toast('success', 'Mot de passe modifié');
      reset();
    } catch (error) {
      toast('error', apiErrorMessage(error));
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm space-y-4">
      {[['current', 'Mot de passe actuel'], ['next', 'Nouveau mot de passe'], ['confirm', 'Confirmer']].map(([n, l]) => (
        <div key={n}>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">{l}</label>
          <input {...register(n as 'current')} type="password" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          {n === 'confirm' && <p className="text-red-500 text-[10px] mt-1">{errors.confirm?.message}</p>}
        </div>
      ))}
      <button type="submit" disabled={isSubmitting} className="dashboard-action flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60">
        <Save className="w-4 h-4" /> Modifier
      </button>
    </form>
  );
}
