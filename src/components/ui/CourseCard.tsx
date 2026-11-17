import { useNavigate } from 'react-router';
import { Star, Users, BookOpen, Clock } from 'lucide-react';
import type { Course } from '../../types';
import { Badge } from './Badge';

interface CourseCardProps {
  course: Course;
  basePath?: string;
  actions?: React.ReactNode;
}

const levelVariant = { 'Débutant': 'emerald', 'Intermédiaire': 'amber', 'Avancé': 'red' } as const;

export function CourseCard({ course, basePath = '/student/courses', actions }: CourseCardProps) {
  const navigate = useNavigate();

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.02] transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/[0.07] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900 dark:hover:shadow-black/15">
      <button
        type="button"
        aria-label={`Ouvrir le cours ${course.title}`}
        className="relative block h-40 w-full cursor-pointer overflow-hidden bg-slate-200 text-left dark:bg-slate-700"
        onClick={() => navigate(`${basePath}/${course.id}`)}
      >
        {course.thumbnail && (
          <img src={course.thumbnail} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
        <div className="absolute top-2 left-2">
          <Badge variant={levelVariant[course.level] || 'slate'}>{course.level}</Badge>
        </div>
        <span className="absolute bottom-3 right-3 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 opacity-0 shadow transition-opacity group-hover:opacity-100">
          Voir le cours
        </span>
      </button>
      <div className="p-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{course.category}</p>
        <button
          type="button"
          className="line-clamp-2 text-left text-sm font-semibold text-slate-900 transition-colors hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
          onClick={() => navigate(`${basePath}/${course.id}`)}
        >
          {course.title}
        </button>
        <p className="mt-1 truncate text-[10px] text-slate-500 dark:text-slate-400">Par {course.teacherName}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="w-3 h-3 fill-current" />
            <span className="text-[10px] font-semibold">{course.rating}</span>
            <span className="text-[10px] text-slate-400">({course.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Users className="w-3 h-3" />
            <span className="text-[10px]">{course.enrolledCount}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <BookOpen className="w-3 h-3" />
            <span className="text-[10px]">{course.lessons.length} leçons</span>
          </div>
        </div>

        {actions && <div className="mt-3">{actions}</div>}
      </div>
    </article>
  );
}
