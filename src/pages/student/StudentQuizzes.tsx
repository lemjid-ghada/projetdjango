import { useCallback, useEffect, useRef, useState, type ClipboardEvent } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import {
  Clock,
  CheckCircle,
  XCircle,
  Timer,
  ChevronRight,
  Trophy,
  Lock,
  Sparkles,
  ClipboardCheck,
  BookOpen,
  ShieldCheck,
  FileQuestion,
} from "lucide-react"
import { quizzesApi } from "../../api/quizzesApi"
import { Badge } from "../../components/ui/Badge"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../components/ui/Toast"
import { Modal } from "../../components/ui/Modal"
import type { Quiz } from "../../types"
import type { QuizReview, RevisionPlan } from "../../api/quizzesApi"
import { apiErrorMessage } from "../../api/client"

export function StudentQuizzes() {
  const [searchParams] = useSearchParams()
  const requestedQuizId = Number(searchParams.get("quizId"))
  const { user, isPremium } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [taking, setTaking] = useState<Quiz | null>(null)
  const [attemptId, setAttemptId] = useState<number | null>(null)
  const [resultQuiz, setResultQuiz] = useState<Quiz | null>(null)
  const [result, setResult] = useState<QuizReview | null>(null)
  const [revisionPlan, setRevisionPlan] = useState<RevisionPlan | null>(null)
  const [revisionPlanError, setRevisionPlanError] = useState<string | null>(
    null,
  )

  const {
    data: quizzes = [],
    isLoading,
    error,
  } = useQuery({ queryKey: ["quizzes"], queryFn: quizzesApi.getAll })
  const { data: attempts = [], error: attemptsError } = useQuery({
    queryKey: ["my-attempts", user?.id],
    queryFn: () => quizzesApi.getAttempts(undefined, user!.id),
  })
  const orderedQuizzes = requestedQuizId
    ? [...quizzes].sort(
        (left, right) =>
          Number(right.id === requestedQuizId) -
          Number(left.id === requestedQuizId),
      )
    : quizzes
  const openQuizCount = quizzes.filter(quiz => quiz.status !== "closed").length
  const completedQuizCount = new Set(attempts.map(attempt => attempt.quizId)).size

  const startMut = useMutation({
    mutationFn: quizzesApi.startAttempt,
    onSuccess: (started, quizId) => {
      const quiz = quizzes.find((item) => item.id === quizId)
      if (!quiz) return
      setAttemptId(started.id)
      setResultQuiz(quiz)
      setTaking({ ...quiz, questions: started.questions })
    },
    onError: (err, quizId) => {
      const quiz = quizzes.find((item) => item.id === quizId)
      if (quiz?.strictMode && document.fullscreenElement) {
        void document.exitFullscreen().catch((fullscreenError: unknown) => {
          console.error(
            "Impossible de quitter le plein écran après l'échec du quiz.",
            fullscreenError,
          )
        })
      }
      toast("error", apiErrorMessage(err))
    },
  })

  const revisionPlanMut = useMutation({
    mutationFn: quizzesApi.getRevisionPlan,
    onSuccess: (plan) => setRevisionPlan(plan),
    onError: (error) => {
      const message = apiErrorMessage(error)
      setRevisionPlanError(message)
      toast("error", message)
    },
  })

  const submitMut = useMutation({
    mutationFn: (data: {
      answers: number[]
      timeTaken: number
      textAnswers: { questionId: number; textAnswer: string }[]
    }) => {
      if (attemptId === null) throw new Error("Aucune tentative active.")
      return quizzesApi.submitAttempt(
        attemptId,
        data.answers,
        data.timeTaken,
        data.textAnswers,
      )
    },
    onSuccess: (attempt) => {
      setTaking(null)
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch((fullscreenError: unknown) => {
          console.error("Impossible de quitter le plein écran.", fullscreenError)
        })
      }
      setResult(attempt)
      setRevisionPlan(null)
      setRevisionPlanError(null)
      if (attempt.score < 50) revisionPlanMut.mutate(attempt.id)
      void qc.invalidateQueries({ queryKey: ["my-attempts", user?.id] })
      void qc.invalidateQueries({ queryKey: ["student-dashboard"] })
      void qc.invalidateQueries({ queryKey: ["quizzes"] })
      toast(
        attempt.passed ? "success" : "warning",
        attempt.passed ? "Quiz réussi !" : "Quiz non réussi",
      )
    },
    onError: (err) => toast("error", apiErrorMessage(err)),
  })

  if (taking)
    return (
      <QuizPlayer
        quiz={taking}
        onSubmit={(data) => submitMut.mutate(data)}
        submitting={submitMut.isPending}
        onCancel={() => {
          setTaking(null)
          if (document.fullscreenElement) {
            void document.exitFullscreen().catch((fullscreenError: unknown) => {
              console.error("Impossible de quitter le plein écran.", fullscreenError)
            })
          }
        }}
      />
    )

  return (
    <div className="dashboard-page space-y-6">
      <div className="dashboard-hero dashboard-hero-student relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[35px] border-white/[0.08]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-100">
              <Sparkles className="h-3.5 w-3.5" /> Réviser et progresser
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Prêt à relever un défi ?</h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-indigo-100">Choisissez une évaluation, testez vos connaissances et suivez votre progression.</p>
          </div>
          <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10 shadow-lg sm:flex">
            <ClipboardCheck className="h-10 w-10 text-white" />
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-white/15 pt-4 text-xs text-indigo-100">
          <span><strong className="mr-1 text-white">{openQuizCount}</strong> quiz ouverts</span>
          <span><strong className="mr-1 text-white">{completedQuizCount}</strong> quiz commencés</span>
          <span><strong className="mr-1 text-white">{attempts.length}</strong> tentatives réalisées</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : error || attemptsError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          Impossible de charger les quiz ou vos résultats.
        </div>
      ) : quizzes.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          Inscrivez-vous à un cours pour accéder à ses quiz.
        </div>
      ) : (
        <div className="space-y-4">
          {orderedQuizzes.map((q) => {
            const myAttempts = attempts.filter((a) => a.quizId === q.id)
            const best = myAttempts.length
              ? Math.max(...myAttempts.map((a) => a.score))
              : null
            const isClosed = q.status === "closed"
            const isPremiumLocked = q.isFinal && !isPremium
            const alreadyAttempted =
              !q.allowMultipleAttempts && myAttempts.length > 0

            return (
              <article
                key={q.id}
                className={`dashboard-panel overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-900 ${
                  q.id === requestedQuizId
                    ? "border-violet-400 ring-2 ring-violet-200 dark:border-violet-500 dark:ring-violet-900"
                    : isClosed
                      ? "border-slate-200 opacity-80 dark:border-slate-800"
                      : "border-slate-200/80 dark:border-slate-800"
                }`}
              >
                {q.id === requestedQuizId && (
                  <p className="flex items-center gap-2 border-b border-violet-100 bg-violet-50 px-5 py-2.5 text-xs font-semibold text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300">
                    <Sparkles className="h-3.5 w-3.5" /> Quiz sélectionné par le raccourci IA
                  </p>
                )}
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                      isClosed
                        ? "bg-slate-100 dark:bg-slate-800"
                        : "bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950 dark:to-violet-950"
                    }`}
                  >
                    {isClosed ? (
                      <Lock className="w-5 h-5 text-slate-400" />
                    ) : (
                      <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start gap-2">
                    <h3 className={`min-w-0 flex-1 text-base font-bold ${
                        isClosed
                          ? "text-slate-500"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {q.title}
                    </h3>
                    <Badge variant={isClosed ? "slate" : "emerald"}>{isClosed ? "Fermé" : "Disponible"}</Badge>
                    </div>
                    {q.isFinal && (
                      <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        <Lock className="h-3.5 w-3.5" /> Quiz final Premium
                      </span>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      {q.courseName}
                    </p>
                    {q.strictMode && (
                      <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                        <ShieldCheck className="h-3.5 w-3.5" /> Mode examen strict · plein écran requis
                      </span>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium">{q.duration} min</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <FileQuestion className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-medium">{q.questions.length} questions</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Trophy className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium">Réussite {q.passingScore}%</span>
                      </div>
                      {best !== null && (
                        <Badge
                          variant={best >= q.passingScore ? "emerald" : "red"}
                        >
                          Meilleur: {best}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isPremiumLocked && !isClosed && !alreadyAttempted ? (
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new Event("open-premium-modal"))}
                      className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-amber-600"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Débloquer avec Premium
                    </button>
                  ) : isClosed || alreadyAttempted ? (
                    <button
                      disabled
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-400 text-xs font-semibold rounded-xl shrink-0 cursor-not-allowed"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {isClosed ? "Fermé" : "Tentative déjà utilisée"}
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        if (q.strictMode) {
                          if (!document.documentElement.requestFullscreen) {
                            toast(
                              "error",
                              "Le plein écran n'est pas pris en charge par ce navigateur.",
                            )
                            return
                          }
                          try {
                            await document.documentElement.requestFullscreen()
                          } catch {
                            toast(
                              "error",
                              "Autorisez le plein écran pour commencer ce quiz strict.",
                            )
                            return
                          }
                        }
                        startMut.mutate(q.id)
                      }}
                      disabled={startMut.isPending}
                      className="dashboard-action flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {startMut.isPending
                        ? "Chargement..."
                        : myAttempts.length > 0
                          ? "Réessayer"
                          : "Commencer"}{" "}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={!!result}
        onClose={() => setResult(null)}
        title="Résultat du quiz"
        size={result && result.score < 50 ? "lg" : "md"}
      >
        {result && (
          <div className="p-5 text-center">
            <div
              className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${
                result.passed
                  ? "bg-emerald-50 dark:bg-emerald-950"
                  : "bg-red-50 dark:bg-red-950"
              }`}
            >
              {result.passed ? (
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600" />
              )}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {result.score}%
            </h3>
            <p
              className={`text-sm font-semibold mb-2 ${
                result.passed ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {result.passed ? "🎉 Quiz réussi !" : "😕 Score insuffisant"}
            </p>
            <p className="text-xs text-slate-500 mb-5">{result.quizTitle}</p>
            {result.needsReview && (
              <p className="mb-4 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                Certaines réponses sont en attente de relecture par
                l’enseignant.
              </p>
            )}
            {result.score < 50 && (
              <section className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-left dark:border-indigo-900 dark:bg-indigo-950/40">
                <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                  Votre plan de révision personnalisé
                </h4>
                {revisionPlanMut.isPending ? (
                  <p className="mt-2 text-xs text-indigo-700 dark:text-indigo-300">
                    Le tuteur IA analyse vos réponses et prépare votre plan...
                  </p>
                ) : revisionPlanError ? (
                  <p
                    role="alert"
                    className="mt-2 text-xs text-red-700 dark:text-red-300"
                  >
                    Le plan n’a pas pu être généré : {revisionPlanError}
                  </p>
                ) : revisionPlan ? (
                  <div className="mt-3 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {revisionPlan.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {revisionPlan.summary}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Points à retravailler
                      </p>
                      <ul className="mt-2 space-y-2">
                        {revisionPlan.weakPoints.map((point, index) => (
                          <li
                            key={`${point.topic}-${index}`}
                            className="rounded-lg bg-white p-3 text-xs dark:bg-slate-900"
                          >
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {point.topic}
                            </p>
                            <p className="mt-1 text-slate-600 dark:text-slate-300">
                              {point.diagnosis}
                            </p>
                            <p className="mt-1 text-indigo-700 dark:text-indigo-300">
                              Conseil : {point.recommendation}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Programme sur 7 jours
                      </p>
                      <ol className="mt-2 space-y-2">
                        {revisionPlan.steps.map((step, index) => (
                          <li
                            key={`${step.day}-${index}`}
                            className="rounded-lg bg-white p-3 text-xs dark:bg-slate-900"
                          >
                            <p className="font-semibold text-slate-900 dark:text-white">
                              Jour {step.day} · {step.title} ·{" "}
                              {step.durationMinutes} min
                            </p>
                            <p className="mt-1 text-slate-600 dark:text-slate-300">
                              {step.activity}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <p className="text-xs font-medium text-indigo-800 dark:text-indigo-200">
                      {revisionPlan.encouragement}
                    </p>
                  </div>
                ) : null}
              </section>
            )}
            <div className="mb-5 space-y-2 text-left">
              {result.review.map((answer, index) => (
                <div
                  key={answer.questionId}
                  className={`rounded-lg p-3 text-xs ${
                    answer.needsReview
                      ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      : answer.is_correct
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
                  }`}
                >
                  <p className="font-semibold">
                    {resultQuiz?.questions[index]?.text}
                  </p>
                  <p className="mt-1">
                    Votre réponse :{" "}
                    {answer.textAnswer ||
                      (answer.selectedIndex >= 0
                        ? resultQuiz?.questions[index]?.options[
                            answer.selectedIndex
                          ]
                        : "Sans réponse")}
                  </p>
                  {answer.needsReview && (
                    <p className="mt-1 font-semibold">
                      En attente de relecture
                    </p>
                  )}
                  {!answer.needsReview && answer.correctIndex >= 0 && (
                    <p>
                      Bonne réponse :{" "}
                      {
                        resultQuiz?.questions[index]?.options[
                          answer.correctIndex
                        ]
                      }
                    </p>
                  )}
                  {answer.aiFeedback && (
                    <p className="mt-1">{answer.aiFeedback}</p>
                  )}
                  {answer.explanation && (
                    <p className="mt-1">{answer.explanation}</p>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setResult(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Fermer
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

interface QuizPlayerProps {
  quiz: Quiz
  onSubmit: (data: {
    answers: number[]
    textAnswers: { questionId: number; textAnswer: string }[]
    timeTaken: number
  }) => void
  submitting: boolean
  onCancel: () => void
}

function QuizPlayer({ quiz, onSubmit, submitting, onCancel }: QuizPlayerProps) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<number[]>(
    Array(quiz.questions.length).fill(-1),
  )
  const [textAnswers, setTextAnswers] = useState<Record<number, string>>({})
  const [startTime] = useState(Date.now())
  const [confirming, setConfirming] = useState(false)
  const fraudReportSent = useRef(false)
  const quizEnded = useRef(false)
  const { toast } = useToast()

  const q = quiz.questions[current]
  const answered = quiz.questions.filter((question, index) =>
    question.type === "short_answer"
      ? Boolean(textAnswers[question.id]?.trim())
      : answers[index] !== -1,
  ).length

  const reportIncident = useCallback(async (
    reason: "copy" | "tab_hidden" | "fullscreen_exit",
  ) => {
    if (fraudReportSent.current || quizEnded.current) return
    fraudReportSent.current = true
    quizEnded.current = true

    try {
      const report = await quizzesApi.reportFraud(quiz.id, reason)
      toast("warning", report.detail)
      onCancel()
    } catch (error) {
      fraudReportSent.current = false
      toast("error", apiErrorMessage(error))
      if (reason !== "copy" || quiz.strictMode) {
        onCancel()
      } else {
        quizEnded.current = false
      }
    }
  }, [onCancel, quiz.id, quiz.strictMode, toast])

  useEffect(() => {
    if (!quiz.strictMode) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void reportIncident("tab_hidden")
      }
    }
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        void reportIncident("fullscreen_exit")
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    if (document.visibilityState === "hidden") {
      void reportIncident("tab_hidden")
    } else if (!document.fullscreenElement) {
      void reportIncident("fullscreen_exit")
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [quiz.strictMode, reportIncident])

  const handleCopy = (event: ClipboardEvent<HTMLDivElement>) => {
    if (
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLInputElement
    )
      return
    event.preventDefault()
    void reportIncident("copy")
  }

  const handleSubmit = () => {
    quizEnded.current = true
    const timeTaken = Math.round((Date.now() - startTime) / 60000)
    onSubmit({
      answers: quiz.questions.flatMap((question, index) =>
        question.type === "short_answer" ? [] : [answers[index]],
      ),
      textAnswers: quiz.questions
        .filter((question) => question.type === "short_answer")
        .map((question) => ({
          questionId: question.id,
          textAnswer: textAnswers[question.id] ?? "",
        })),
      timeTaken,
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            quizEnded.current = true
            onCancel()
          }}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          ← Abandonner
        </button>
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            {quiz.duration} min max
          </span>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>
            Question {current + 1} / {quiz.questions.length}
          </span>
          <span>{answered} répondu(s)</span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all"
            style={{
              width: `${((current + 1) / quiz.questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6"
        onCopy={handleCopy}
        onCut={handleCopy}
      >
        <p className="text-base font-semibold text-slate-900 dark:text-white mb-6">
          {q.text}
        </p>

        {q.type === "short_answer" ? (
          <textarea
            style={{ userSelect: "text" }}
            value={textAnswers[q.id] ?? ""}
            onChange={(event) =>
              setTextAnswers((currentAnswers) => ({
                ...currentAnswers,
                [q.id]: event.target.value,
              }))
            }
            rows={6}
            maxLength={10000}
            placeholder="Rédigez votre réponse…"
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        ) : (
          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() =>
                  setAnswers((prev) => {
                    const n = [...prev]
                    n[current] = i
                    return n
                  })
                }
                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-sm text-left transition-all ${
                  answers[current] === i
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                    : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    answers[current] === i
                      ? "border-indigo-600 bg-indigo-600"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {answers[current] === i && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-between">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
        >
          Précédent
        </button>
        {current < quiz.questions.length - 1 ? (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
          >
            Suivant
          </button>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
          >
            Soumettre ({answered}/{quiz.questions.length})
          </button>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Soumettre le quiz ?
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Vous avez répondu à {answered} questions sur{" "}
              {quiz.questions.length}. Confirmez-vous la soumission ?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-60"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
