"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"

type CalendarMode = "month" | "week"

interface Project {
  id: string
  title: string
  category: string
  start_date: string | null
  deadline: string | null
  status: string
  image_url: string | null
  color?: string
}

interface CalendarEvent {
  projectId: string
  projectTitle: string
  projectCategory: string
  date: string
  type: "start" | "deadline" | "duration"
  color: string
}

export function CalendarView() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleProjects, setVisibleProjects] = useState<Set<string>>(new Set())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [mode, setMode] = useState<CalendarMode>("month")

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const response = await fetch("/api/projects")
      if (response.ok) {
        const data = await response.json()
        const projectsWithColors = data.projects.map((p: Project, index: number) => ({
          ...p,
          color: getProjectColor(index)
        }))
        setProjects(projectsWithColors)
        // Par défaut, afficher tous les projets
        setVisibleProjects(new Set(projectsWithColors.map((p: Project) => p.id)))
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setLoading(false)
    }
  }

  function getProjectColor(index: number): string {
    const colors = [
      "#8b5cf6", // violet
      "#3b82f6", // bleu
      "#10b981", // vert
      "#f59e0b", // orange
      "#ef4444", // rouge
      "#ec4899", // rose
      "#06b6d4", // cyan
      "#84cc16", // lime
    ]
    return colors[index % colors.length]
  }

  function toggleProjectVisibility(projectId: string) {
    setVisibleProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  // Générer les événements du calendrier
  function generateCalendarEvents(): CalendarEvent[] {
    const events: CalendarEvent[] = []

    projects.forEach(project => {
      if (!visibleProjects.has(project.id)) return

      // Événement de début
      if (project.start_date) {
        events.push({
          projectId: project.id,
          projectTitle: project.title,
          projectCategory: project.category,
          date: project.start_date,
          type: "start",
          color: project.color || "#8b5cf6"
        })
      }

      // Événement de deadline
      if (project.deadline) {
        events.push({
          projectId: project.id,
          projectTitle: project.title,
          projectCategory: project.category,
          date: project.deadline,
          type: "deadline",
          color: project.color || "#8b5cf6"
        })
      }

      // Événements de durée (tous les jours entre début et fin)
      if (project.start_date && project.deadline) {
        const start = new Date(project.start_date)
        const end = new Date(project.deadline)
        const current = new Date(start)

        while (current < end) {
          current.setDate(current.getDate() + 1)
          if (current < end) {
            events.push({
              projectId: project.id,
              projectTitle: project.title,
              projectCategory: project.category,
              date: current.toISOString().split('T')[0],
              type: "duration",
              color: project.color || "#8b5cf6"
            })
          }
        }
      }
    })

    return events
  }

  // Générer les jours du mois actuel
  function generateCalendarDays() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    const days: (Date | null)[] = []

    // Padding avant
    for (let i = 0; i < startPadding; i++) {
      days.push(null)
    }

    // Jours du mois
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  function getEventsForDay(date: Date): CalendarEvent[] {
    const dateStr = date.toISOString().split('T')[0]
    return generateCalendarEvents().filter(event => event.date === dateStr)
  }

  function changeMonth(delta: number) {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1))
  }

  function changeWeek(delta: number) {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (delta * 7))
    setCurrentDate(newDate)
  }

  // Générer les jours de la semaine courante
  function generateWeekDays() {
    const days: Date[] = []
    const current = new Date(currentDate)

    // Trouver le lundi de la semaine
    const dayOfWeek = current.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    current.setDate(current.getDate() + diff)

    // Ajouter les 7 jours de la semaine
    for (let i = 0; i < 7; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const calendarDays = mode === "month" ? generateCalendarDays() : []
  const weekDays = mode === "week" ? generateWeekDays() : []
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const weekRange = mode === "week"
    ? `${weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${weekDays[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : ""
  const today = new Date().toISOString().split('T')[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Calendrier des projets</h1>
        <p className="text-muted-foreground font-normal">
          Vue chronologique de tous vos projets
        </p>
      </div>

      {/* Légende des projets */}
      <Card className="p-6 border-border bg-card/50 backdrop-blur-sm">
        <h3 className="text-lg font-medium mb-4">Projets affichés</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map(project => (
            <label
              key={project.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/50 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={visibleProjects.has(project.id)}
                onCheckedChange={() => toggleProjectVisibility(project.id)}
              />
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-normal truncate">{project.title}</p>
                {project.category && (
                  <p className="text-xs text-muted-foreground">{project.category}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Calendrier */}
      <Card className="p-6 border-border bg-card/50 backdrop-blur-sm">
        {/* Barre d'outils */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant={mode === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("month")}
              className="font-normal"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Mois
            </Button>
            <Button
              variant={mode === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("week")}
              className="font-normal"
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Semaine
            </Button>
          </div>
          <h2 className="text-2xl font-medium capitalize">
            {mode === "month" ? monthName : weekRange}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => mode === "month" ? changeMonth(-1) : changeWeek(-1)}
              className="font-normal"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => mode === "month" ? changeMonth(1) : changeWeek(1)}
              className="font-normal"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Grille du calendrier - Vue Mois */}
        {mode === "month" && (
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />
              }

              const dateStr = day.toISOString().split('T')[0]
              const events = getEventsForDay(day)
              const isToday = dateStr === today

              return (
                <div
                  key={dateStr}
                  className={`aspect-square border border-border rounded-lg p-2 transition-all ${
                    isToday ? 'border-accent bg-accent/5' : 'bg-background/50'
                  } ${events.length > 0 ? 'cursor-pointer hover:border-accent/50' : ''}`}
                >
                  <div className="h-full flex flex-col">
                    <span className={`text-sm font-normal mb-1 ${isToday ? 'text-accent font-semibold' : 'text-muted-foreground'}`}>
                      {day.getDate()}
                    </span>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      {events.map((event, idx) => {
                        if (idx >= 3) return null // Limiter à 3 événements visibles

                        return (
                          <div
                            key={`${event.projectId}-${idx}`}
                            className="text-xs rounded px-1 py-0.5 truncate"
                            style={{
                              backgroundColor: `${event.color}20`,
                              color: event.color,
                              borderLeft: `3px solid ${event.color}`
                            }}
                            title={`${event.projectTitle} - ${event.type === 'start' ? 'Début' : event.type === 'deadline' ? 'Échéance' : ''}`}
                          >
                            {event.type === 'start' && '▶ '}
                            {event.type === 'deadline' && '🏁 '}
                            {event.type === 'duration' && '—'}
                            <span className="ml-1">{event.projectTitle}</span>
                          </div>
                        )
                      })}
                      {events.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{events.length - 3} autre{events.length - 3 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Grille du calendrier - Vue Semaine */}
        {mode === "week" && (
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-3">
              {weekDays.map(day => {
                const dateStr = day.toISOString().split('T')[0]
                const events = getEventsForDay(day)
                const isToday = dateStr === today

                return (
                  <div key={dateStr} className="space-y-2">
                    {/* En-tête du jour */}
                    <div className={`text-center p-3 rounded-lg border border-border ${
                      isToday ? 'border-accent bg-accent/5' : 'bg-background/50'
                    }`}>
                      <div className="text-xs text-muted-foreground font-normal">
                        {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </div>
                      <div className={`text-2xl font-normal ${isToday ? 'text-accent font-semibold' : ''}`}>
                        {day.getDate()}
                      </div>
                      <div className="text-xs text-muted-foreground font-normal">
                        {day.toLocaleDateString('fr-FR', { month: 'short' })}
                      </div>
                    </div>

                    {/* Événements du jour */}
                    <div className="space-y-2 min-h-[300px]">
                      {events.length === 0 ? (
                        <div className="text-center text-xs text-muted-foreground py-4">
                          Aucun événement
                        </div>
                      ) : (
                        events.map((event, idx) => (
                          <div
                            key={`${event.projectId}-${idx}`}
                            className="text-sm rounded-lg p-3 cursor-pointer hover:opacity-80 transition-opacity"
                            style={{
                              backgroundColor: `${event.color}15`,
                              borderLeft: `4px solid ${event.color}`
                            }}
                            onClick={() => router.push(`/projet/${event.projectId}`)}
                          >
                            <div className="font-medium mb-1" style={{ color: event.color }}>
                              {event.type === 'start' && '▶ Début'}
                              {event.type === 'deadline' && '🏁 Échéance'}
                              {event.type === 'duration' && '— En cours'}
                            </div>
                            <div className="text-xs font-normal text-foreground">
                              {event.projectTitle}
                            </div>
                            {event.projectCategory && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {event.projectCategory}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Légende */}
      <Card className="p-4 border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-6 text-sm font-normal text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>▶</span>
            <span>Début du projet</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🏁</span>
            <span>Échéance</span>
          </div>
          <div className="flex items-center gap-2">
            <span>—</span>
            <span>Durée du projet</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
