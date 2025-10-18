"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { mutate } from "swr"
import useSWR from "swr"
import { useTranslations } from 'next-intl'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Calendar, LogOut, FolderKanban, ListTodo, User, Activity, CalendarDays, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"
import { UpgradeModal } from "@/components/upgrade-modal"
import { signOut } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"

// ⚡ OPTIMISATION : Lazy loading des composants de vue
const DailyPlanner = lazy(() => import("@/components/daily-planner").then(m => ({ default: m.DailyPlanner })))
const ProjectsList = lazy(() => import("@/components/projects-list").then(m => ({ default: m.ProjectsList })))
const TrackersView = lazy(() => import("@/components/trackers-view").then(m => ({ default: m.TrackersView })))
const AgendaView = lazy(() => import("@/components/agenda-view").then(m => ({ default: m.AgendaView })))
const CalendarView = lazy(() => import("@/components/calendar-view").then(m => ({ default: m.CalendarView })))

type View = "goals" | "planner" | "trackers" | "agenda" | "calendar"

export default function Home() {
  const t = useTranslations('nav')
  const [currentView, setCurrentView] = useState<View>("goals")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [accountType, setAccountType] = useState<'standard' | 'premium'>('standard')
  const router = useRouter()

  // ⚡ OPTIMISATION : Utiliser useAuth avec SWR pour cache + vérification non-bloquante
  const { user, isLoading, isAuthenticated } = useAuth()

  // Rediriger si non authentifié (après vérification)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth")
    }
  }, [isLoading, isAuthenticated, router])

  // ⚡ OPTIMISATION : Utiliser SWR pour la vérification onboarding (cache + moins d'appels)
  const { data: profileData } = useSWR(
    isAuthenticated ? "/api/profile" : null,
    {
      dedupingInterval: 3600000, // Cache 1 heure
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  // Rediriger si onboarding non complété
  useEffect(() => {
    if (profileData?.profile &&
        (profileData.profile.onboarding_completed === false ||
         profileData.profile.onboarding_completed === undefined)) {
      router.push("/onboarding")
    }
  }, [profileData, router])

  // ⚡ OPTIMISATION : Prefetch des données critiques pour pré-peupler le cache SWR
  useEffect(() => {
    if (isAuthenticated) {
      const today = new Date().toISOString().split('T')[0]

      // Précharger en arrière-plan et pré-peupler le cache SWR
      fetch("/api/projects")
        .then(r => r.json())
        .then(data => mutate("/api/projects", data, false))
        .catch(() => {})

      fetch(`/api/daily-plan?date=${today}`)
        .then(r => r.json())
        .then(data => mutate(`/api/daily-plan?date=${today}`, data, false))
        .catch(() => {})
    }
  }, [isAuthenticated])

  // Récupérer le type de compte de l'utilisateur
  useEffect(() => {
    if (isAuthenticated && profileData?.profile) {
      setAccountType(profileData.profile.account_type || 'standard')
    }
  }, [isAuthenticated, profileData])

  async function handleSignOut() {
    await signOut()
    router.push("/auth")
  }

  async function handleUpgrade() {
    try {
      const response = await fetch('/api/account/upgrade', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        setShowUpgradeModal(false)
        setAccountType('premium')
        // Rafraîchir les données du profil
        mutate('/api/profile')
        alert('Félicitations ! Vous êtes maintenant Premium ✨')
      } else {
        alert(data.message || 'Erreur lors de l\'upgrade')
      }
    } catch (error) {
      console.error('Error upgrading:', error)
      alert('Erreur lors de l\'upgrade. Veuillez réessayer.')
    }
  }

  // ⚡ Afficher l'UI immédiatement, même pendant le chargement

  return (
    <div className="min-h-screen flex">
      {/* Sidebar gauche */}
      <aside className={`border-r border-border bg-card/30 backdrop-blur-sm flex flex-col sticky top-0 h-screen transition-all duration-300 ${sidebarCollapsed ? "w-16" : "w-64"}`}>
        {/* Logo et bouton collapse */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          {!sidebarCollapsed && (
            <h1 className="text-xl font-semibold tracking-tight">Memo'ry planner</h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full flex-shrink-0"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Button
            variant={currentView === "planner" ? "secondary" : "ghost"}
            className={`w-full justify-start font-normal ${currentView === "planner" ? "bg-accent/10 text-accent" : ""}`}
            onClick={() => setCurrentView("planner")}
            title={sidebarCollapsed ? t('dailyPlanner') : ""}
          >
            <Calendar className={`h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`} />
            {!sidebarCollapsed && t('dailyPlanner')}
          </Button>
          <Button
            variant={currentView === "trackers" ? "secondary" : "ghost"}
            className={`w-full justify-start font-normal ${currentView === "trackers" ? "bg-accent/10 text-accent" : ""}`}
            onClick={() => setCurrentView("trackers")}
            title={sidebarCollapsed ? t('myTrackers') : ""}
          >
            <Activity className={`h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`} />
            {!sidebarCollapsed && t('myTrackers')}
          </Button>
          <Button
            variant={currentView === "calendar" ? "secondary" : "ghost"}
            className={`w-full justify-start font-normal ${currentView === "calendar" ? "bg-accent/10 text-accent" : ""}`}
            onClick={() => setCurrentView("calendar")}
            title={sidebarCollapsed ? t('calendar') : ""}
          >
            <CalendarDays className={`h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`} />
            {!sidebarCollapsed && t('calendar')}
          </Button>
          <Button
            variant={currentView === "goals" ? "secondary" : "ghost"}
            className={`w-full justify-start font-normal ${currentView === "goals" ? "bg-accent/10 text-accent" : ""}`}
            onClick={() => setCurrentView("goals")}
            title={sidebarCollapsed ? t('myProjects') : ""}
          >
            <FolderKanban className={`h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`} />
            {!sidebarCollapsed && t('myProjects')}
          </Button>
          <Button
            variant={currentView === "agenda" ? "secondary" : "ghost"}
            className={`w-full justify-start font-normal ${currentView === "agenda" ? "bg-accent/10 text-accent" : ""}`}
            onClick={() => setCurrentView("agenda")}
            title={sidebarCollapsed ? t('nextSteps') : ""}
          >
            <ListTodo className={`h-5 w-5 ${sidebarCollapsed ? "" : "mr-3"}`} />
            {!sidebarCollapsed && t('nextSteps')}
          </Button>
        </nav>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Header avec actions utilisateur */}
        <header className="border-b border-border backdrop-blur-sm sticky top-0 z-50 bg-background/80">
          <div className="px-6 py-4 flex items-center justify-end">
            <div className="flex items-center gap-2">
              {accountType === 'standard' && (
                <Button
                  variant="default"
                  size="sm"
                  className="bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 text-white"
                  onClick={() => setShowUpgradeModal(true)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Passer Premium
                </Button>
              )}
              <LanguageSwitcher />
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push("/profil")}>
                <User className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main className="flex-1 px-6 py-12 overflow-y-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }>
            {currentView === "goals" && <ProjectsList />}
            {currentView === "planner" && <DailyPlanner />}
            {currentView === "trackers" && <TrackersView />}
            {currentView === "agenda" && <AgendaView />}
            {currentView === "calendar" && <CalendarView />}
          </Suspense>
        </main>
      </div>

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  )
}
