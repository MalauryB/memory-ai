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

interface Tracker {
  id: string
  title: string
  category: string
  project_id: string
  project_title: string
  frequency: string
  frequency_value: number
  start_date: string
}

interface CalendarEvent {
  projectId: string
  projectTitle: string
  projectCategory: string
  date: string
  type: "start" | "deadline" | "duration" | "tracker"
  color: string
  trackerId?: string
  trackerTitle?: string
  frequency?: string
}

export function CalendarView() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [trackers, setTrackers] = useState<Tracker[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleProjects, setVisibleProjects] = useState<Set<string>>(new Set())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [mode, setMode] = useState<CalendarMode>("month")

  useEffect(() => {
    fetchProjects()
    fetchTrackers()
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

  async function fetchTrackers() {
    try {
      const response = await fetch("/api/trackers")
      if (response.ok) {
        const data = await response.json()
        setTrackers(data.trackers || [])
      }
    } catch (error) {
      console.error("Erreur récupération trackers:", error)
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

    // Ajouter les trackers
    trackers.forEach(tracker => {
      if (!visibleProjects.has(tracker.project_id)) return

      const project = projects.find(p => p.id === tracker.project_id)
      if (!project) return

      // Générer les dates selon la fréquence
      const startDate = new Date(tracker.start_date)
      const viewStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const viewEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      // Ajuster la date de début si elle est avant la vue
      let current = new Date(Math.max(startDate.getTime(), viewStart.getTime()))

      while (current <= viewEnd) {
        const shouldShow = (() => {
          switch (tracker.frequency) {
            case "daily":
              return true
            case "every_x_days": {
              const daysDiff = Math.floor((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
              return daysDiff % tracker.frequency_value === 0
            }
            case "weekly": {
              const daysDiff = Math.floor((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
              return daysDiff % 7 === 0
            }
            default:
              return false
          }
        })()

        if (shouldShow) {
          events.push({
            projectId: tracker.project_id,
            projectTitle: tracker.project_title,
            projectCategory: tracker.category,
            date: current.toISOString().split('T')[0],
            type: "tracker",
            color: project.color || "#8b5cf6",
            trackerId: tracker.id,
            trackerTitle: tracker.title,
            frequency: tracker.frequency
          })
        }

        current.setDate(current.getDate() + 1)
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

  // Mémoriser les événements du calendrier pour éviter de les régénérer à chaque fois
  const calendarEvents = generateCalendarEvents()

  function getEventsForDay(date: Date): CalendarEvent[] {
    const dateStr = date.toISOString().split('T')[0]
    return calendarEvents.filter(event => event.date === dateStr)
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
    <div className="flex gap-4 h-[calc(100vh-10rem)] overflow-hidden">
      {/* Sidebar gauche - Liste des projets */}
      <aside className="w-52 shrink-0 space-y-1 overflow-y-auto pr-2">
        {projects.map(project => (
          <label
            key={project.id}
            className="flex items-center gap-2 p-1.5 rounded border border-border hover:border-accent/50 cursor-pointer transition-colors"
          >
            <Checkbox
              checked={visibleProjects.has(project.id)}
              onCheckedChange={() => toggleProjectVisibility(project.id)}
              className="h-3 w-3"
            />
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-normal truncate leading-tight">{project.title}</p>
            </div>
          </label>
        ))}
      </aside>

      {/* Calendrier principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Card className="p-4 border-border bg-card/50 backdrop-blur-sm flex-1 flex flex-col overflow-hidden">
        {/* Barre d'outils */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <Button
              variant={mode === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("month")}
              className="font-normal h-7 text-xs px-2"
            >
              <CalendarIcon className="h-3 w-3 mr-1" />
              Mois
            </Button>
            <Button
              variant={mode === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("week")}
              className="font-normal h-7 text-xs px-2"
            >
              <CalendarDays className="h-3 w-3 mr-1" />
              Semaine
            </Button>
          </div>
          <h2 className="text-lg font-medium capitalize">
            {mode === "month" ? monthName : weekRange}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => mode === "month" ? changeMonth(-1) : changeWeek(-1)}
              className="font-normal h-7 w-7 p-0"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => mode === "month" ? changeMonth(1) : changeWeek(1)}
              className="font-normal h-7 w-7 p-0"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Grille du calendrier - Vue Mois */}
        {mode === "month" && (
          <div className="grid grid-cols-7 gap-0.5 flex-1 min-h-0">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-16" />
              }

              const dateStr = day.toISOString().split('T')[0]
              const events = getEventsForDay(day)
              const isToday = dateStr === today

              return (
                <div
                  key={dateStr}
                  className={`h-16 border border-border rounded p-0.5 transition-all ${
                    isToday ? 'border-accent bg-accent/5' : 'bg-background/50'
                  } ${events.length > 0 ? 'cursor-pointer hover:border-accent/50' : ''}`}
                >
                  <div className="h-full flex flex-col">
                    <span className={`text-[9px] font-normal leading-none mb-0.5 ${isToday ? 'text-accent font-semibold' : 'text-muted-foreground'}`}>
                      {day.getDate()}
                    </span>
                    <div className="flex-1 space-y-0.5 overflow-hidden">
                      {events.map((event, idx) => {
                        if (idx >= 2) return null // Limiter à 2 événements visibles

                        return (
                          <div
                            key={`${event.projectId}-${event.trackerId || idx}`}
                            className="text-[8px] rounded px-0.5 py-0.5 truncate leading-none"
                            style={{
                              backgroundColor: `${event.color}20`,
                              color: event.color,
                              borderLeft: `2px solid ${event.color}`
                            }}
                            title={`${event.projectTitle} - ${
                              event.type === 'start' ? 'Début' :
                              event.type === 'deadline' ? 'Échéance' :
                              event.type === 'tracker' ? 'Tracker' :
                              ''
                            }`}
                          >
                            {event.type === 'start' && '▶ '}
                            {event.type === 'deadline' && '🏁 '}
                            {event.type === 'duration' && '—'}
                            {event.type === 'tracker' && '✓ '}
                            <span className="ml-0.5">
                              {event.type === 'tracker' ? event.trackerTitle : event.projectTitle}
                            </span>
                          </div>
                        )
                      })}
                      {events.length > 2 && (
                        <div className="text-[8px] text-muted-foreground leading-none">
                          +{events.length - 2}
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
          <div className="flex-1 min-h-0">
            <div className="grid grid-cols-7 gap-1.5 h-full">
              {weekDays.map(day => {
                const dateStr = day.toISOString().split('T')[0]
                const events = getEventsForDay(day)
                const isToday = dateStr === today

                return (
                  <div key={dateStr} className="flex flex-col min-h-0">
                    {/* En-tête du jour */}
                    <div className={`text-center p-1.5 rounded border border-border mb-1 ${
                      isToday ? 'border-accent bg-accent/5' : 'bg-background/50'
                    }`}>
                      <div className="text-[9px] text-muted-foreground font-normal">
                        {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </div>
                      <div className={`text-lg font-normal leading-tight ${isToday ? 'text-accent font-semibold' : ''}`}>
                        {day.getDate()}
                      </div>
                      <div className="text-[9px] text-muted-foreground font-normal">
                        {day.toLocaleDateString('fr-FR', { month: 'short' })}
                      </div>
                    </div>

                    {/* Événements du jour */}
                    <div className="flex-1 space-y-1 overflow-y-auto min-h-0">
                      {events.length === 0 ? (
                        <div className="text-center text-[9px] text-muted-foreground py-2">
                          Aucun événement
                        </div>
                      ) : (
                        events.map((event, idx) => (
                          <div
                            key={`${event.projectId}-${event.trackerId || idx}`}
                            className="text-[10px] rounded p-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                            style={{
                              backgroundColor: `${event.color}15`,
                              borderLeft: `2px solid ${event.color}`
                            }}
                            onClick={() => router.push(`/projet/${event.projectId}`)}
                          >
                            <div className="font-medium mb-0.5 leading-tight" style={{ color: event.color }}>
                              {event.type === 'start' && '▶ Début'}
                              {event.type === 'deadline' && '🏁 Échéance'}
                              {event.type === 'duration' && '— En cours'}
                              {event.type === 'tracker' && '✓ Tracker'}
                            </div>
                            <div className="text-[9px] font-normal text-foreground leading-tight">
                              {event.type === 'tracker' ? event.trackerTitle : event.projectTitle}
                            </div>
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

        {/* Légende */}
        <div className="mt-2 pt-2 border-t border-border shrink-0">
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>▶</span>
              <span>Début</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🏁</span>
              <span>Échéance</span>
            </div>
            <div className="flex items-center gap-1">
              <span>—</span>
              <span>Durée</span>
            </div>
            <div className="flex items-center gap-1">
              <span>✓</span>
              <span>Tracker</span>
            </div>
          </div>
        </div>
      </Card>
      </div>
    </div>
  )
}
