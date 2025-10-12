"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Target, Calendar, LogOut, FolderKanban, ListTodo, User, Activity, CalendarDays } from "lucide-react"
import { GoalCard } from "@/components/goal-card"
import { DailyPlanner } from "@/components/daily-planner"
import { ProjectsList } from "@/components/projects-list"
import { TrackersView } from "@/components/trackers-view"
import { AgendaView } from "@/components/agenda-view"
import { CalendarView } from "@/components/calendar-view"
import { ThemeToggle } from "@/components/theme-toggle"
import { getUser, signOut } from "@/lib/auth"

type View = "dashboard" | "goals" | "planner" | "trackers" | "agenda" | "calendar"

interface DashboardStats {
  activeProjects: number
  tasksToday: number
  completedToday: number
  progressPercentage: number
}

interface ProjectPreview {
  id: string
  title: string
  progress: number
  deadline: string
  category: string
}

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("dashboard")
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    tasksToday: 0,
    completedToday: 0,
    progressPercentage: 0
  })
  const [projectsPreview, setProjectsPreview] = useState<ProjectPreview[]>([])
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (!loading && currentView === "dashboard") {
      fetchDashboardStats()
    }
  }, [loading, currentView])

  async function checkUser() {
    const user = await getUser()
    if (!user) {
      router.push("/auth")
    } else {
      setLoading(false)
    }
  }

  async function fetchDashboardStats() {
    try {
      const response = await fetch("/api/dashboard/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setProjectsPreview(data.projectsPreview)
      }
    } catch (error) {
      console.error("Erreur récupération stats:", error)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push("/auth")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground font-normal">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar gauche */}
      <aside className="w-64 border-r border-border bg-card/30 backdrop-blur-sm flex flex-col sticky top-0 h-screen">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-semibold tracking-tight">Life Architect</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Button
            variant={currentView === "dashboard" ? "secondary" : "ghost"}
            className={`w-full justify-start font-normal ${currentView === "dashboard" ? "bg-accent/10 text-accent" : ""}`}
            onClick={() => setCurrentView("dashboard")}
          >
            <Target className="h-5 w-5 mr-3" />
            Tableau de bord
          </Button>
          <Button
            variant={currentView === "goals" ? "secondary" : "ghost"}
            className={`w-full justify-start font-normal ${currentView === "goals" ? "bg-accent/10 text-accent" : ""}`}
            onClick={() => setCurrentView("goals")}
          >
            <FolderKanban className="h-5 w-5 mr-3" />
            Mes projets
          </Button>
          <Button
            variant={currentView === "calendar" ? "secondary" : "ghost"}
            className={`w-full justify-start font-normal ${currentView === "calendar" ? "bg-accent/10 text-accent" : ""}`}
            onClick={() => setCurrentView("calendar")}
          >
            <CalendarDays className="h-5 w-5 mr-3" />
            Calendrier
          </Button>
          <Button
            variant={currentView === "agenda" ? "secondary" : "ghost"}
            className={`w-full justify-start font-normal ${currentView === "agenda" ? "bg-accent/10 text-accent" : ""}`}
            onClick={() => setCurrentView("agenda")}
          >
            <ListTodo className="h-5 w-5 mr-3" />
            Prochaines étapes
          </Button>
          <Button
            variant={currentView === "trackers" ? "secondary" : "ghost"}
            className={`w-full justify-start font-normal ${currentView === "trackers" ? "bg-accent/10 text-accent" : ""}`}
            onClick={() => setCurrentView("trackers")}
          >
            <Activity className="h-5 w-5 mr-3" />
            Mes trackers
          </Button>
          <Button
            variant={currentView === "planner" ? "secondary" : "ghost"}
            className={`w-full justify-start font-normal ${currentView === "planner" ? "bg-accent/10 text-accent" : ""}`}
            onClick={() => setCurrentView("planner")}
          >
            <Calendar className="h-5 w-5 mr-3" />
            Planning journalier
          </Button>
        </nav>

        {/* Bouton nouveau projet */}
        <div className="p-4 border-t border-border">
          <Button
            className="w-full font-normal"
            onClick={() => router.push("/nouveau-projet")}
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouveau projet
          </Button>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Header avec actions utilisateur */}
        <header className="border-b border-border backdrop-blur-sm sticky top-0 z-50 bg-background/80">
          <div className="px-6 py-4 flex items-center justify-end">
            <div className="flex items-center gap-2">
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
          {currentView === "dashboard" && (
            <div className="space-y-16 max-w-6xl mx-auto">
              {/* Hero section */}
              <section className="space-y-4">
                <h2 className="text-5xl font-semibold tracking-tight text-balance leading-tight">Bonjour</h2>
                <p className="text-lg text-muted-foreground font-normal leading-relaxed">
                  Votre espace pour architecturer votre vie, un objectif à la fois.
                </p>
              </section>

              {/* Quick stats */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-8 border-border bg-card/50 backdrop-blur-sm">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-normal">Projets actifs</p>
                    <p className="text-4xl font-semibold">{stats.activeProjects}</p>
                  </div>
                </Card>
                <Card className="p-8 border-border bg-card/50 backdrop-blur-sm">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-normal">Tâches aujourd'hui</p>
                    <p className="text-4xl font-semibold">
                      {stats.completedToday}<span className="text-xl text-muted-foreground">/{stats.tasksToday}</span>
                    </p>
                  </div>
                </Card>
                <Card className="p-8 border-border bg-card/50 backdrop-blur-sm">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-normal">Progression globale</p>
                    <p className="text-4xl font-semibold">
                      {stats.progressPercentage}<span className="text-xl text-muted-foreground">%</span>
                    </p>
                  </div>
                </Card>
              </section>

              {/* Active goals preview */}
              {projectsPreview.length > 0 && (
                <section className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-medium tracking-tight">Projets en cours</h3>
                    <Button
                      variant="ghost"
                      className="text-accent hover:text-accent/80"
                      onClick={() => setCurrentView("goals")}
                    >
                      Voir tout
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {projectsPreview.map((project) => (
                      <GoalCard
                        key={project.id}
                        title={project.title}
                        progress={project.progress}
                        deadline={project.deadline}
                        category={project.category}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {projectsPreview.length === 0 && (
                <section>
                  <Card className="p-12 border-border bg-card/50 backdrop-blur-sm text-center">
                    <div className="space-y-4">
                      <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto" />
                      <div className="space-y-2">
                        <h3 className="text-xl font-medium">Aucun projet pour le moment</h3>
                        <p className="text-sm text-muted-foreground font-normal">
                          Créez votre premier projet pour commencer à organiser vos objectifs.
                        </p>
                      </div>
                      <Button onClick={() => router.push("/nouveau-projet")} className="font-normal">
                        <Plus className="h-4 w-4 mr-2" />
                        Créer un projet
                      </Button>
                    </div>
                  </Card>
                </section>
              )}
            </div>
          )}

          {currentView === "goals" && <ProjectsList />}
          {currentView === "planner" && <DailyPlanner />}
          {currentView === "trackers" && <TrackersView />}
          {currentView === "agenda" && <AgendaView />}
          {currentView === "calendar" && <CalendarView />}
        </main>
      </div>
    </div>
  )
}
