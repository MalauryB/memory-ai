"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Target, Calendar, TrendingUp, MessageSquare, LogOut } from "lucide-react"
import { GoalCard } from "@/components/goal-card"
import { DailyPlanner } from "@/components/daily-planner"
import { ProgressView } from "@/components/progress-view"
import { AIChat } from "@/components/ai-chat"
import { getUser, signOut } from "@/lib/auth"

type View = "dashboard" | "goals" | "planner" | "progress" | "chat"

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("dashboard")
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
        <p className="text-muted-foreground font-light">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-light tracking-tight text-balance">Life Architect</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Plus className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12">
        {currentView === "dashboard" && (
          <div className="space-y-16">
            {/* Hero section */}
            <section className="space-y-4 max-w-2xl">
              <h2 className="text-5xl font-light tracking-tight text-balance leading-tight">Bonjour</h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed">
                Votre espace pour architecturer votre vie, un objectif à la fois.
              </p>
            </section>

            {/* Quick stats */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
              <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-light">Objectifs actifs</p>
                  <p className="text-4xl font-light">3</p>
                </div>
              </Card>
              <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-light">Tâches aujourd'hui</p>
                  <p className="text-4xl font-light">5</p>
                </div>
              </Card>
              <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-light">Progression</p>
                  <p className="text-4xl font-light">
                    67<span className="text-xl text-muted-foreground">%</span>
                  </p>
                </div>
              </Card>
            </section>

            {/* Active goals preview */}
            <section className="space-y-8 max-w-4xl">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-light tracking-tight">Objectifs en cours</h3>
                <Button variant="ghost" className="text-accent hover:text-accent/80">
                  Voir tout
                </Button>
              </div>
              <div className="space-y-4">
                <GoalCard
                  title="Apprendre le développement web"
                  progress={75}
                  deadline="30 jours restants"
                  category="Carrière"
                />
                <GoalCard title="Courir un marathon" progress={45} deadline="90 jours restants" category="Santé" />
                <GoalCard
                  title="Lire 12 livres cette année"
                  progress={33}
                  deadline="6 mois restants"
                  category="Personnel"
                />
              </div>
            </section>
          </div>
        )}

        {currentView === "planner" && <DailyPlanner />}
        {currentView === "progress" && <ProgressView />}
        {currentView === "chat" && <AIChat />}
      </main>

      <nav className="border-t border-border/50 backdrop-blur-sm sticky bottom-0 bg-background/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-around max-w-2xl mx-auto">
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${currentView === "dashboard" ? "text-accent" : "text-muted-foreground"}`}
              onClick={() => setCurrentView("dashboard")}
            >
              <Target className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${currentView === "planner" ? "text-accent" : "text-muted-foreground"}`}
              onClick={() => setCurrentView("planner")}
            >
              <Calendar className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${currentView === "progress" ? "text-accent" : "text-muted-foreground"}`}
              onClick={() => setCurrentView("progress")}
            >
              <TrendingUp className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${currentView === "chat" ? "text-accent" : "text-muted-foreground"}`}
              onClick={() => setCurrentView("chat")}
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>
    </div>
  )
}
