"use client"

import { useState, useEffect, memo, useCallback } from "react"
import useSWR, { mutate } from "swr"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Clock, Loader2, Sparkles, FolderOpen, MapPin, Coffee, Lightbulb, X, ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { PlanningConfigurator } from "@/components/planning-configurator"

interface DailyTask {
  id: string
  title: string
  description: string
  estimatedDuration: string
  scheduledTime: string
  projectTitle?: string
  projectCategory?: string
  substepId?: string
  stepId?: string
  projectId?: string
  priority: number
  itemType: 'substep' | 'tracker' | 'custom_activity' | 'break' | 'suggested_activity'
  completed?: boolean
  location?: {
    name: string
    address: string
    type: string
  }
  isSuggested?: boolean
  canBeCombined?: boolean
}

// ⚡ OPTIMISATION : Memo pour éviter re-renders inutiles
export const DailyPlanner = memo(function DailyPlanner() {
  const [generating, setGenerating] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  const dateParam = selectedDate.toISOString().split('T')[0]

  // ⚡ OPTIMISATION : Utiliser SWR pour le cache automatique
  const { data, error, isLoading, mutate: refreshPlan } = useSWR(
    `/api/daily-plan?date=${dateParam}`,
    {
      // Revalider toutes les 60 secondes si la page est active
      refreshInterval: 60000,
      // Garder les données précédentes pendant le rechargement
      keepPreviousData: true,
    }
  )

  const tasks = data?.tasks || []
  const availableHours = data?.availableHours || 8
  const hasPlanning = !data?.needsGeneration && tasks.length > 0

  // ⚡ OPTIMISATION : Timer intelligent - démarrer à la prochaine minute exacte
  useEffect(() => {
    const now = new Date()
    const secondsUntilNextMinute = 60 - now.getSeconds()
    const msUntilNextMinute = secondsUntilNextMinute * 1000 - now.getMilliseconds()

    // Attendre jusqu'à la prochaine minute
    const timeout = setTimeout(() => {
      setCurrentTime(new Date())

      // Puis mettre à jour toutes les minutes
      const interval = setInterval(() => {
        setCurrentTime(new Date())
      }, 60000)

      return () => clearInterval(interval)
    }, msUntilNextMinute)

    return () => clearTimeout(timeout)
  }, [])

  // ⚡ OPTIMISATION : Memoizer les fonctions de callback
  const changeDate = useCallback((days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }, [selectedDate])

  const isToday = useCallback((date: Date): boolean => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }, [])

  const isTomorrow = useCallback((date: Date): boolean => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return date.toDateString() === tomorrow.toDateString()
  }, [])

  const getDateLabel = useCallback((): string => {
    if (isToday(selectedDate)) return "Aujourd'hui"
    if (isTomorrow(selectedDate)) return "Demain"
    return selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
  }, [selectedDate, isToday, isTomorrow])

  async function toggleTaskCompletion(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // ⚡ OPTIMISATION : Mutation optimiste - mettre à jour l'UI immédiatement
    const newTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    )

    // Mettre à jour le cache local immédiatement
    await refreshPlan(
      { ...data, tasks: newTasks },
      false // Ne pas revalider immédiatement
    )

    // Sauvegarder en base en arrière-plan
    try {
      await fetch(`/api/daily-plan/items/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: !task.completed
        })
      })
    } catch (error) {
      console.error("Erreur sauvegarde:", error)
      // En cas d'erreur, revalider pour récupérer l'état correct
      refreshPlan()
    }
  }

  async function deleteTask(taskId: string) {
    // ⚡ OPTIMISATION : Mutation optimiste
    const newTasks = tasks.filter(t => t.id !== taskId)

    // Mettre à jour le cache immédiatement
    await refreshPlan(
      { ...data, tasks: newTasks },
      false
    )

    try {
      const response = await fetch(`/api/daily-plan/items/${taskId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        // En cas d'erreur, revalider
        refreshPlan()
      }
    } catch (error) {
      console.error("Erreur suppression:", error)
      refreshPlan()
    }
  }

  // Fonction pour vérifier si une tâche est passée
  function isTaskPast(scheduledTime: string): boolean {
    const [hours, minutes] = scheduledTime.split(':').map(Number)
    const taskTime = new Date()
    taskTime.setHours(hours, minutes, 0, 0)

    return currentTime > taskTime
  }

  async function generateWithConfig(config: { intensity: string; style: string; selectedActivities: string[] }) {
    setGenerating(true)

    try {
      const response = await fetch("/api/daily-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...config,
          date: dateParam,
          currentTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
          forceRegenerate: true
        })
      })

      if (response.ok) {
        const newData = await response.json()
        console.log("Nouveau planning généré:", newData.tasks?.length, "tâches")

        // ⚡ OPTIMISATION : Mettre à jour le cache SWR immédiatement
        await refreshPlan(newData, false)
      } else {
        console.error("Erreur génération:", response.status)
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-12 max-w-4xl mx-auto">
        <div className="space-y-4">
          <h2 className="text-4xl font-semibold tracking-tight text-balance">Planning du jour</h2>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold tracking-tight text-balance">Planning du jour</h2>

            {/* Sélecteur de date */}
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeDate(-1)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-accent/10 border border-accent/20">
                <Calendar className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-medium">
                  {getDateLabel()}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeDate(1)}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {!isToday(selectedDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                  className="h-8 text-xs"
                >
                  Aujourd'hui
                </Button>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <PlanningConfigurator onGenerate={generateWithConfig} loading={generating} />
          </div>
        </div>

        {tasks.length > 0 && (
          <p className="text-xs text-muted-foreground font-medium">
            {tasks.filter(t => t.completed).length} / {tasks.length} tâches terminées
          </p>
        )}
      </div>

      {generating ? (
        <Card className="p-8 border-border bg-card/50 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-accent" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Génération de votre planning...</h3>
              <p className="text-xs text-muted-foreground font-normal max-w-md mx-auto">
                Analyse de vos projets, trackers et préférences en cours
              </p>
            </div>
          </div>
        </Card>
      ) : tasks.length === 0 ? (
        <Card className="p-8 border-border bg-card/50 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Sparkles className="h-12 w-12 text-accent" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Prêt à planifier votre journée ?</h3>
              <p className="text-xs text-muted-foreground font-normal max-w-md mx-auto">
                Générez un planning intelligent adapté à vos projets et votre niveau d'énergie.
              </p>
            </div>
            <PlanningConfigurator onGenerate={generateWithConfig} loading={generating} />
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isBreak = task.itemType === 'break'
            const isSuggestion = task.isSuggested
            const isCustomActivity = task.itemType === 'custom_activity'
            const isPast = isTaskPast(task.scheduledTime)

            return (
              <div key={task.id} className="relative group">
                <Card
                  className={`p-3 border backdrop-blur-sm transition-all ${
                    isBreak ? "bg-accent/5 border-accent/30" :
                    isSuggestion ? "bg-purple-500/5 border-purple-500/30" :
                    isCustomActivity ? "bg-accent/5 border-accent/30" :
                    "bg-card/50 border-border"
                  } ${
                    task.completed ? "opacity-50" :
                    isPast ? "opacity-40 grayscale" :
                    "hover:border-accent/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                  {!isBreak && (
                    <Checkbox
                      checked={task.completed || false}
                      onCheckedChange={() => toggleTaskCompletion(task.id)}
                      className="rounded-full mt-0.5"
                    />
                  )}
                  {isBreak && (
                    <div className="flex items-center justify-center w-4 h-4 mt-0.5">
                      <Coffee className="h-3.5 w-3.5 text-accent" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </p>
                          {isSuggestion && (
                            <Badge variant="secondary" className="font-normal text-[10px] py-0 h-4">
                              <Lightbulb className="h-2.5 w-2.5 mr-0.5" />
                              Suggestion IA
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground font-normal">
                            {task.description}
                          </p>
                        )}
                        {task.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" />
                            <span className="font-normal">{task.location.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs font-medium font-mono">{task.scheduledTime}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] flex-wrap">
                      {task.projectTitle && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FolderOpen className="h-2.5 w-2.5" />
                          <span className="font-normal">{task.projectTitle}</span>
                        </div>
                      )}
                      {task.estimatedDuration && (
                        <span className="text-muted-foreground font-normal">
                          • {task.estimatedDuration}
                        </span>
                      )}
                      {task.projectCategory && (
                        <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-normal">
                          {task.projectCategory}
                        </span>
                      )}
                      {task.itemType === 'tracker' && (
                        <Badge variant="outline" className="font-normal text-[10px] py-0 h-4">
                          Habitude
                        </Badge>
                      )}
                      {isCustomActivity && (
                        <Badge variant="outline" className="font-normal text-[10px] py-0 h-4 border-accent/30 text-accent">
                          Activité perso
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                </Card>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="absolute top-2 right-2 p-1 rounded-md bg-background/80 backdrop-blur-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                  title="Retirer cette tâche du planning"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})
