import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Eye, Search, GraduationCap, Sparkles, SlidersHorizontal, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router';
import { coursesApi } from '../../api/coursesApi';
import { CourseCard } from '../../components/ui/CourseCard';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import type { Course } from '../../types';
import { CourseForm } from './CourseForm';
import { apiErrorMessage } from '../../api/client';

export function TeacherCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);

  const { data: courses = [], isLoading, error } = useQuery({ queryKey: ['teacher-courses', user?.id], queryFn: () => coursesApi.getByTeacher(user!.id) });
  const deleteMut = useMutation({ mutationFn: (id: number) => coursesApi.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-courses'] }); toast('success', 'Cours supprimé'); setDeleting(null); }, onError: error => toast('error', apiErrorMessage(error)) });

  const filtered = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="dashboard-page space-y-6">
      <div className="dashboard-hero dashboard-hero-teacher relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[35px] border-white/[0.05]" />
        <div className="relative flex items-center justify-between gap-5">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-100">
              <Sparkles className="h-3.5 w-3.5" /> Studio enseignant
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Vos cours, votre espace</h1>
            <p className="mt-1.5 text-sm text-indigo-100/80">{courses.length} cours créés · gérez vos contenus et accompagnez vos étudiants.</p>
          </div>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="dashboard-action inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-indigo-900 shadow-sm transition hover:bg-indigo-50">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Créer un cours</span><span className="sm:hidden">Créer</span>
          </button>
        </div>
        <div className="relative mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-indigo-100/80">
          <BookOpen className="h-4 w-4" /> Votre bibliothèque de cours
        </div>
      </div>

      <div className="dashboard-panel flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 px-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <SlidersHorizontal className="h-4 w-4 text-indigo-500" /> Bibliothèque
        </div>
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par titre ou catégorie..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger vos cours.</div>
      ) : isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({length:3}).map((_,i) => <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Plus} title="Aucun cours" description="Créez votre premier cours pour commencer à enseigner." action={<button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl">Créer un cours</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              basePath="/teacher/courses"
              actions={
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(`/teacher/courses/${course.id}`)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    <Eye className="w-3.5 h-3.5" /> Voir
                  </button>
                  <button onClick={() => { setEditing(course); setModalOpen(true); }} className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-lg transition-colors">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleting(course)} className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Modifier le cours' : 'Créer un cours'} size="lg">
        <CourseForm
          initial={editing}
          onSuccess={course => {
            const save = editing
              ? coursesApi.update(editing.id, course)
              : coursesApi.create(course);
            void save.then(() => {
              qc.invalidateQueries({ queryKey: ['teacher-courses'] });
              qc.invalidateQueries({ queryKey: ['teacher-dashboard'] });
              toast('success', editing ? 'Cours modifié' : 'Cours créé');
              setModalOpen(false);
              setEditing(null);
            }).catch(error => toast('error', apiErrorMessage(error)));
          }}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)}
        title="Supprimer le cours"
        message={`Êtes-vous sûr de vouloir supprimer "${deleting?.title}" ?`}
        confirmLabel="Supprimer"
        loading={deleteMut.isPending}
      />
    </div>
  );
}
