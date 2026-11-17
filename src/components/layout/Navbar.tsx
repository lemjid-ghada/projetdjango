import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useLocation, useNavigate } from "react-router"
import { Menu, Sun, Moon, Bell, ChevronDown, User, LogOut, Sparkles, Crown } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { notificationsApi } from "../../api/notificationsApi"
import { apiErrorMessage } from "../../api/client"
import { useToast } from "../ui/Toast"

interface NavbarProps {
  onMenuClick: () => void
  onCommandPalette?: () => void
  onPremiumClick?: () => void
  title?: string
}

export function Navbar({ onMenuClick, onCommandPalette, onPremiumClick, title }: NavbarProps) {
  const { user, logout, isPremium } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const qc = useQueryClient()
  const { toast } = useToast()
  const { data: notifications = [], error: notificationsError } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.getAll,
    refetchInterval: user?.role === "ENSEIGNANT" ? 15_000 : false,
  })
  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (error) => toast("error", apiErrorMessage(error)),
  })
  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length

  const profilePath =
    user?.role === "ETUDIANT" ? "/student/profile" : user?.role === "ADMIN" ? "/admin/profile" : "/profile"
  const pageTitles: Record<string, string> = {
    "/student/dashboard": "Tableau de bord",
    "/student/courses": "Mes cours",
    "/student/quizzes": "Mes quiz",
    "/student/planner": "Planning de révision",
    "/student/flashcards": "Mes flashcards",
    "/teacher/dashboard": "Tableau de bord",
    "/teacher/courses": "Gestion des cours",
    "/teacher/quizzes": "Gestion des quiz",
    "/admin/dashboard": "Vue d’ensemble",
    "/admin/users": "Gestion des utilisateurs",
    "/admin/profile": "Mon profil",
  }
  const currentTitle = title || pageTitles[location.pathname]

  return (
    <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Ouvrir le menu"
        className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {currentTitle && (
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {currentTitle}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-400">
            {user?.role === "ETUDIANT" ? "Espace étudiant" : user?.role === "ENSEIGNANT" ? "Espace enseignant" : "Administration"}
          </p>
        </div>
      )}

      <div className="flex-1" />

      {user?.role === "ETUDIANT" && (
        <button
          type="button"
          onClick={onCommandPalette}
          aria-label="Ouvrir le raccourci IA"
          title="Raccourci IA (Ctrl/Cmd+K)"
          className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Raccourci IA</span>
          <kbd className="hidden rounded border border-violet-200 px-1 text-[9px] sm:inline dark:border-violet-800">⌘/Ctrl K</kbd>
        </button>
      )}

      {user?.role === "ETUDIANT" && (
        <button
          type="button"
          onClick={isPremium ? undefined : onPremiumClick}
          disabled={isPremium}
          aria-label={isPremium ? "Statut Premium actif" : "Devenir Premium"}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
            isPremium
              ? "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              : "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm hover:from-amber-600 hover:to-orange-600"
          }`}
        >
          <Crown className="h-4 w-4" />
          <span className="hidden sm:inline">{isPremium ? "Premium" : "Devenir Premium"}</span>
        </button>
      )}

      <button
        onClick={toggle}
        aria-label={isDark ? "Activer le thème clair" : "Activer le thème sombre"}
        title={isDark ? "Thème clair" : "Thème sombre"}
        className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {isDark ? (
          <Sun className="h-4.5 w-4.5" />
        ) : (
          <Moon className="h-4.5 w-4.5" />
        )}
      </button>

      <div className="relative">
        <button
          onClick={() => setNotificationsOpen((open) => !open)}
          aria-label="Notifications"
          className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        {notificationsOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-30">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white">
              Notifications
            </div>
            {notificationsError ? (
              <p role="alert" className="p-4 text-xs text-red-600">
                Impossible de charger les notifications.
              </p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-xs text-slate-400">Aucune notification.</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() =>
                    !notification.read && markRead.mutate(notification.id)
                  }
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 ${
                    notification.read ? "opacity-70" : ""
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-[9px] text-slate-400">
                    {new Date(notification.createdAt).toLocaleString("fr-FR")}
                    {!notification.read && " · Nouveau"}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <img
            src={
              user?.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || "U")}&background=4F46E5&color=fff`
            }
            alt={user?.fullName}
            className="w-7 h-7 rounded-full object-cover"
          />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 hidden sm:block max-w-24 truncate">
            {user?.fullName}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-20 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {user?.fullName}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={() => {
                  navigate(profilePath)
                  setDropdownOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <User className="w-3.5 h-3.5" /> Mon profil
              </button>
              <button
                onClick={() => {
                  logout()
                  navigate("/login")
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <LogOut className="w-3.5 h-3.5" /> Déconnexion
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
