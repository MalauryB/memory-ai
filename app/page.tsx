"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Calendar, LogOut, FolderKanban, ListTodo, User, Activity, CalendarDays } from "lucide-react"
import { DailyPlanner } from "@/components/daily-planner"
import { ProjectsList } from "@/components/projects-list"
import { TrackersView } from "@/components/trackers-view"
import { AgendaView } from "@/components/agenda-view"
import { CalendarView } from "@/components/calendar-view"
import { ThemeToggle } from "@/components/theme-toggle"
import { getUser, signOut } from "@/lib/auth"

type View = "goals" | "planner" | "trackers" | "agenda" | "calendar"

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("goals")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const user = await getUser()
    if (!user) {
      router.push("/auth")
    } else {
      setLoading(false)
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
