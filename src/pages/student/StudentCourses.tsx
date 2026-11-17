import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { Search, ChevronRight, BookOpen, CheckCircle, PlayCircle, FileText, Mic, Languages, Sparkles, RotateCw, Check, X, Compass, SlidersHorizontal, GraduationCap, Crown, Lock } from 'lucide-react';
import { coursesApi, type CourseFlashcard } from '../../api/coursesApi';
import { progressApi } from '../../api/progressApi';
import { apiClient, apiErrorMessage } from '../../api/client';
import { CourseCard } from '../../components/ui/CourseCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge } from '../../components/ui/Badge';
import { StudentCourseDocuments } from '../../components/ui/StudentCourseDocuments';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '../../api/paymentApi';

const levels = ['Tous', 'Débutant', 'Intermédiaire', 'Avancé'] as const;
const categories = ['Toutes', 'Développement Web', 'Data Science', 'Design', 'Backend', 'Mobile'];

export function StudentCourses() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('Tous');
  const [category, setCategory] = useState('Toutes');
  const [tab, setTab] = useState<'all' | 'mine'>('all');

  const { data: courses = [], isLoading, error: coursesError } = useQuery({ queryKey: ['courses'], queryFn: coursesApi.getAll });
  const { data: progress = [] } = useQuery({ queryKey: ['my-progress', user?.id], queryFn: () => progressApi.getByStudent(user!.id) });
  const { data: enrolledCourseIds = [], error } = useQuery({ queryKey: ['my-enrollments'], queryFn: coursesApi.getMyEnrollments });
  const qc = useQueryClient();
  const { toast } = useToast();
  const enrollMut = useMutation({
    mutationFn: coursesApi.enroll,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-enrollments'] });
      qc.invalidateQueries({ queryKey: ['my-progress'] });
      toast('success', 'Inscription au cours confirmée');
    },
    onError: err => toast('error', apiErrorMessage(err)),
  });

  const myCourseIds = enrolledCourseIds;

  const filtered = courses.filter(c => {
    if (tab === 'mine' && !myCourseIds.includes(c.id)) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (level !== 'Tous' && c.level !== level) return false;
    if (category !== 'Toutes' && c.category !== category) return false;
    return true;
  });

  return (
    <div className="dashboard-page space-y-6">
      <div className="dashboard-hero dashboard-hero-student relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[35px] border-white/[0.08]" />
        <div className="relative flex items-center justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-100">
              <Compass className="h-3.5 w-3.5" /> Explorez et apprenez
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Trouvez votre prochain cours</h1>
            <p className="mt-1.5 text-sm text-indigo-100">{courses.length} formations pour faire grandir vos compétences.</p>
          </div>
          <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10 shadow-lg sm:flex">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
        </div>
      </div>

      <div className="dashboard-panel rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <SlidersHorizontal className="h-4 w-4 text-indigo-500" /> Affiner les cours
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un cours..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          <select value={level} onChange={e => setLevel(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            {levels.map(l => <option key={l}>{l}</option>)}
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {([['all', 'Tous les cours'], ['mine', 'Mes cours']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} className={`rounded-lg px-4 py-2.5 text-xs font-semibold transition-all ${tab === val ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({length:6}).map((_,i) => <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : error || coursesError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger vos inscriptions.</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-400">Aucun cours trouvé</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(c => {
            const p = progress.find(pr => pr.courseId === c.id);
            return (
              <CourseCard
                key={c.id}
                course={c}
                basePath="/student/courses"
                actions={
                  p ? (
                    <div>
                      <ProgressBar value={p.percentage} size="sm" showPercent />
                      <p className="text-[10px] text-slate-500 mt-1">{p.completedLessons}/{p.totalLessons} leçons</p>
                    </div>
                  ) : enrolledCourseIds.includes(c.id) ? (
                    <span className="text-xs text-emerald-600 font-medium">Inscrit</span>
                  ) : (
                    <button onClick={event => { event.preventDefault(); enrollMut.mutate(c.id); }} disabled={enrollMut.isPending} className="w-full py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-60">
                      {enrollMut.isPending ? 'Inscription...' : 'S’inscrire'}
                    </button>
                  )
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function StudentCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  // --- ÉTATS POUR LE PODCAST ---
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // --- ÉTATS POUR LA TRADUCTION ---
  const [currentLang, setCurrentLang] = useState('fr');
  const [translatedCourse, setTranslatedCourse] = useState<Awaited<ReturnType<typeof coursesApi.translate>> | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [flashcards, setFlashcards] = useState<CourseFlashcard[] | null>(null);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcardSetNumber, setFlashcardSetNumber] = useState(0);
  const flashcardRequest = useRef(0);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    flashcardRequest.current += 1;
    setAudioUrl(null);
    setTranslatedCourse(null);
    setCurrentLang('fr');
    setFlashcards(null);
    setIsGeneratingFlashcards(false);
  }, [id]);

  const { data: course, isLoading, error } = useQuery({ queryKey: ['course', id], queryFn: () => coursesApi.getById(Number(id)) });
  const { data: premiumStatus } = useQuery({
    queryKey: ['premium-status'],
    queryFn: paymentApi.getPremiumStatus,
    enabled: user?.role === 'ETUDIANT',
  });
  const aiQuotaExhausted = !isPremium && premiumStatus?.ai_usage.remaining === 0;
  const { data: progress = [] } = useQuery({ queryKey: ['my-progress', user?.id], queryFn: () => progressApi.getByStudent(user!.id) });
  const { data: enrolledCourseIds = [] } = useQuery({ queryKey: ['my-enrollments'], queryFn: coursesApi.getMyEnrollments });
  const isEnrolled = enrolledCourseIds.includes(Number(id));
  const enrollMut = useMutation({
    mutationFn: () => coursesApi.enroll(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-enrollments'] });
      qc.invalidateQueries({ queryKey: ['my-progress'] });
      toast('success', 'Inscription au cours confirmée');
    },
    onError: err => toast('error', apiErrorMessage(err)),
  });

  const myProgress = progress.find(p => p.courseId === Number(id));
  const markMut = useMutation({
    mutationFn: ({ lessonId }: { lessonId: number }) => progressApi.markLessonComplete(Number(id), lessonId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-progress'] }); toast('success', 'Leçon marquée comme complétée !'); },
    onError: err => toast('error', apiErrorMessage(err)),
  });

  // --- FONCTION POUR GÉNÉRER LE PODCAST ---
  const handleListen = async () => {
    if (!course) return;
    setIsLoadingAudio(true);
    try {
      const response = await apiClient.get(`/courses/${course.id}/podcast/`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      setAudioUrl(url);
      void qc.invalidateQueries({ queryKey: ['premium-status'] });
    } catch (error) {
      console.error("Erreur de génération du podcast", error);
      let message = apiErrorMessage(error, "Impossible de générer le résumé audio.");
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try {
          const payload: unknown = JSON.parse(await error.response.data.text());
          if (
            payload &&
            typeof payload === 'object' &&
            'detail' in payload &&
            typeof payload.detail === 'string'
          ) {
            message = payload.detail;
          }
        } catch {
          // Keep the readable Axios fallback for non-JSON error bodies.
        }
      }
      toast('error', message);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // --- FONCTION POUR TRADUIRE ---
  const handleTranslate = async (lang: string) => {
    if (lang === 'fr') {
      setTranslatedCourse(null);
      setCurrentLang('fr');
      return;
    }

    setIsTranslating(true);
    try {
      const response = await coursesApi.translate(Number(id), lang);
      setTranslatedCourse(response);
      setCurrentLang(lang);
      void qc.invalidateQueries({ queryKey: ['premium-status'] });
    } catch (error) {
      toast('error', apiErrorMessage(error, 'Impossible de traduire le cours.'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    const requestId = ++flashcardRequest.current;
    setIsGeneratingFlashcards(true);
    try {
      const generated = await coursesApi.generateFlashcards(Number(id));
      if (requestId !== flashcardRequest.current) return;
      setFlashcards(generated);
      void qc.invalidateQueries({ queryKey: ['premium-status'] });
      setFlashcardSetNumber(number => number + 1);
      toast('success', 'Vos 10 flashcards sont prêtes !');
    } catch (error) {
      if (requestId === flashcardRequest.current) {
        toast('error', apiErrorMessage(error, 'Impossible de générer les flashcards.'));
      }
    } finally {
      if (requestId === flashcardRequest.current) setIsGeneratingFlashcards(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger le cours.</div>;
  if (!course) return <div className="text-center py-12 text-slate-400">Cours non trouvé</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate(-1)} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
        ← Retour
      </button>

      <div className="relative rounded-2xl overflow-hidden h-56 bg-slate-200 dark:bg-slate-700">
        {course.thumbnail && <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-5 text-white">
          <Badge variant="indigo">{course.category}</Badge>
          <h1 className="text-2xl font-bold mt-2">{course.title}</h1>
          <p className="text-sm text-white/80 mt-1">par {course.teacherName}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          
          {isEnrolled && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-indigo-100 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-indigo-900 dark:text-white flex items-center gap-2">
                    <Mic className="w-5 h-5 text-indigo-600" /> 
                    Podcast du cours (IA)
                  </h2>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1 max-w-sm">
                    Écoutez un résumé audio dynamique de ce cours, rédigé et lu par l'intelligence artificielle.
                  </p>
                </div>
                
                {!audioUrl && (aiQuotaExhausted ? (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('open-premium-modal'))}
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-600"
                  >
                    <Lock className="h-4 w-4" /> Débloquer avec Premium
                  </button>
                ) : (
                  <button 
                    onClick={handleListen} 
                    disabled={isLoadingAudio}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 shrink-0"
                  >
                    {isLoadingAudio ? "L'IA rédige..." : "🎧 Générer le Podcast"}
                  </button>
                ))}
              </div>
              
              {audioUrl && (
                <div className="mt-4 p-3 bg-white dark:bg-slate-950 rounded-xl shadow-inner">
                  <audio controls src={audioUrl} className="w-full h-10">
                    Votre navigateur ne supporte pas l'élément audio.
                  </audio>
                  <button onClick={() => setAudioUrl(null)} className="text-[10px] text-red-500 mt-2 font-semibold hover:underline">
                    Recommencer
                  </button>
                </div>
              )}
            </div>
          )}

          {isEnrolled && (
            <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold text-violet-950 dark:text-white">
                    <Sparkles className="h-5 w-5 text-violet-600" />
                    Flashcards de révision
                  </h2>
                  <p className="mt-1 max-w-md text-xs text-violet-800 dark:text-violet-200">
                    Générées à partir des leçons et des PDF du cours. Retournez les cartes puis indiquez celles à revoir.
                  </p>
                </div>
                {aiQuotaExhausted ? (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('open-premium-modal'))}
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-600"
                  >
                    <Lock className="h-4 w-4" /> Débloquer avec Premium
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateFlashcards}
                    disabled={isGeneratingFlashcards}
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isGeneratingFlashcards ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        {flashcards ? 'Créer un nouveau jeu' : 'Créer mes Flashcards'}
                      </>
                    )}
                  </button>
                )}
              </div>
              {flashcards && (
                <div className="mt-5 border-t border-violet-100 pt-5 dark:border-slate-700">
                  <FlashcardStudy key={`${id}-${flashcardSetNumber}`} cards={flashcards} />
                </div>
              )}
            </section>
          )}

          {/* TRADUCTION DU COURS ET DES PDF */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Languages className="w-4 h-4 text-indigo-600" />
                Traduire le cours et ses PDF
              </h2>
              <select
                value={currentLang}
                onChange={event => handleTranslate(event.target.value)}
                disabled={!isEnrolled || isTranslating || aiQuotaExhausted}
                aria-label="Langue de traduction"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-60"
              >
                <option value="fr">Français (original)</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              La traduction inclut la description, le contenu des leçons et le texte des PDF disponibles.
            </p>
            {aiQuotaExhausted && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('open-premium-modal'))}
                className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
              >
                <Crown className="h-4 w-4" /> Quota IA épuisé · Débloquer Premium
              </button>
            )}
            {isTranslating ? (
              <div role="status" className="flex items-center gap-2 text-sm text-indigo-500 animate-pulse">
                <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Traduction par l'IA en cours...
              </div>
            ) : translatedCourse ? (
              <div
                className="max-h-[36rem] space-y-4 overflow-y-auto"
                dir={currentLang === 'ar' ? 'rtl' : 'auto'}
              >
                {translatedCourse.sections.map((section, index) => (
                  <section
                    key={`${section.title}-${index}`}
                    className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"
                  >
                    <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                      {section.title}
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {section.content}
                    </p>
                  </section>
                ))}
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {isEnrolled
                  ? course.description
                  : 'Inscrivez-vous au cours pour traduire le contenu et les PDF.'}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Programme du cours</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {course.lessons.map((lesson, i) => (
                <div key={lesson.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{lesson.title}</p>
                    {lesson.duration && <p className="text-[10px] text-slate-500 mt-0.5">{lesson.duration} min</p>}
                  </div>
                  {lesson.videoUrl && <PlayCircle className="w-4 h-4 text-indigo-400 shrink-0" />}
                  {myProgress && myProgress.completedLessons > i && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                  {isEnrolled && <button
                    onClick={() => markMut.mutate({ lessonId: lesson.id })}
                    disabled={markMut.isPending}
                    className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Suivre
                  </button>}
                </div>
              ))}
            </div>
          </div>
          {isEnrolled && <StudentCourseDocuments courseId={course.id} />}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Ma progression</h3>
            {!isEnrolled ? (
              <div className="text-center py-3">
                <p className="text-xs text-slate-400 mb-3">Inscrivez-vous pour commencer ce cours.</p>
                <button onClick={() => enrollMut.mutate()} disabled={enrollMut.isPending} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-60">
                  {enrollMut.isPending ? 'Inscription...' : 'S’inscrire'}
                </button>
              </div>
            ) : myProgress ? (
              <>
                <ProgressBar value={myProgress.percentage} />
                <p className="text-xs text-slate-500 mt-2">{myProgress.completedLessons} / {myProgress.totalLessons} leçons complétées</p>
              </>
            ) : (
              <div className="text-center py-3">
                <p className="text-xs text-slate-400 mb-3">Pas encore commencé</p>
                <button onClick={() => markMut.mutate({ lessonId: course.lessons[0]?.id })} disabled={!course.lessons[0] || markMut.isPending} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-60">
                  Commencer
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 space-y-2.5">
            {[
              ['Niveau', course.level],
              ['Leçons', `${course.lessons.length} leçons`],
              ['Étudiants', course.enrolledCount],
              ['Note', `${course.rating}/5 (${course.reviewCount} avis)`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-slate-500">{k}</span>
                <span className="font-medium text-slate-900 dark:text-white">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlashcardStudy({ cards }: { cards: CourseFlashcard[] }) {
  const [phase, setPhase] = useState<'study' | 'review' | 'review-ready' | 'done'>('study');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [missedCards, setMissedCards] = useState<CourseFlashcard[]>([]);
  const [reviewQueue, setReviewQueue] = useState<CourseFlashcard[]>([]);
  const [retryCards, setRetryCards] = useState<CourseFlashcard[]>([]);

  const activeCards = phase === 'review' ? reviewQueue : cards;
  const currentCard = activeCards[currentIndex];

  const rateCard = (remembered: boolean) => {
    if (!currentCard) return;
    const nextRetryCards = phase === 'review' && !remembered
      ? [...retryCards, currentCard]
      : retryCards;
    if (phase === 'study' && !remembered) {
      setMissedCards(previous => [...previous, currentCard]);
    }
    if (phase === 'review') setRetryCards(nextRetryCards);
    setIsFlipped(false);

    if (currentIndex + 1 < activeCards.length) {
      setCurrentIndex(index => index + 1);
      return;
    }

    if (phase === 'study') {
      setPhase(missedCards.length + (remembered ? 0 : 1) > 0 ? 'review-ready' : 'done');
    } else {
      setReviewQueue(nextRetryCards);
      setRetryCards([]);
      setPhase(nextRetryCards.length > 0 ? 'review-ready' : 'done');
    }
  };

  const startErrorReview = () => {
    const cardsToReview = phase === 'review-ready' && reviewQueue.length > 0
      ? reviewQueue
      : missedCards;
    setReviewQueue(cardsToReview);
    setRetryCards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setPhase('review');
  };

  if (phase === 'review-ready') {
    const remaining = reviewQueue.length > 0 ? reviewQueue.length : missedCards.length;
    return (
      <div className="rounded-xl bg-white/80 p-5 text-center dark:bg-slate-800">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {remaining} {remaining === 1 ? 'carte à revoir' : 'cartes à revoir'}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Reprenez uniquement les cartes que vous souhaitez retravailler.
        </p>
        <button
          type="button"
          onClick={startErrorReview}
          className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-700"
        >
          Réviser les erreurs
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="rounded-xl bg-white/80 p-5 text-center dark:bg-slate-800" role="status">
        <CheckCircle className="mx-auto h-8 w-8 text-emerald-500" />
        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
          Révision terminée !
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {missedCards.length === 0
            ? 'Vous avez parcouru les 10 flashcards.'
            : 'Toutes les cartes à revoir ont été maîtrisées.'}
        </p>
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{phase === 'review' ? 'Révision des cartes à revoir' : 'Premier passage'}</span>
        <span aria-live="polite">Carte {currentIndex + 1} sur {activeCards.length}</span>
      </div>
      <div className="flashcard-scene">
        <div className={`flashcard-inner${isFlipped ? ' is-flipped' : ''}`}>
          <button
            type="button"
            className="flashcard-face flashcard-front"
            onClick={() => setIsFlipped(true)}
            aria-label="Retourner la flashcard pour voir la réponse"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500">Recto · Question</span>
            <span className="mt-4 text-xl font-bold leading-relaxed text-slate-900 dark:text-white">{currentCard.recto}</span>
            <span className="mt-6 flex items-center gap-2 text-xs font-semibold text-violet-600 dark:text-violet-300">
              <RotateCw className="h-4 w-4" /> Cliquer pour retourner
            </span>
          </button>
          <div className="flashcard-face flashcard-back">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">Verso · Réponse</span>
            <p className="mt-4 text-base leading-relaxed text-slate-800 dark:text-slate-100">{currentCard.verso}</p>
            <button
              type="button"
              onClick={() => setIsFlipped(false)}
              className="mt-3 text-xs font-semibold text-violet-600 hover:underline dark:text-violet-300"
            >
              Retourner la carte
            </button>
            <div className="mt-auto flex w-full flex-wrap justify-center gap-2 pt-5">
              <button
                type="button"
                onClick={() => rateCard(true)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
              >
                <Check className="h-4 w-4" /> Je sais
              </button>
              <button
                type="button"
                onClick={() => rateCard(false)}
                className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
              >
                <X className="h-4 w-4" /> À revoir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}