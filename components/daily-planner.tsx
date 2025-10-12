"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Clock, Loader2, Sparkles, FolderOpen, MapPin, Coffee, Lightbulb, X } from "lucide-react"
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

export function DailyPlanner() {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [availableHours, setAvailableHours] = useState(8)
  const [hasPlanning, setHasPlanning] = useState(false)

  useEffect(() => {
    fetchDailyPlan()
  }, [])

  async function fetchDailyPlan() {
    setLoading(true)
    try {
      const response = await fetch("/api/daily-plan")
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
        setAvailableHours(data.availableHours || 8)
        setHasPlanning(!data.needsGeneration && data.tasks?.length > 0)
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleTaskCompletion(taskId: string) {
    const newTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    )
    setTasks(newTasks)

    // Sauvegarder en base
    try {
      await fetch(`/api/daily-plan/items/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: !tasks.find(t => t.id === taskId)?.completed
        })
      })
    } catch (error) {
      console.error("Erreur sauvegarde:", error)
    }
  }

  async function deleteTask(taskId: string) {
    try {
      const response = await fetch(`/api/daily-plan/items/${taskId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setTasks(tasks.filter(t => t.id !== taskId))
      }
    } catch (error) {
      console.error("Erreur suppression:", error)
    }
  }

  async function generateWithConfig(config: { intensity: string; style: string; selectedActivities: string[] }) {
    setGenerating(true)
    // Vider le planning pendant la génération pour forcer le rafraîchissement
    setTasks([])

    try {
      const response = await fetch("/api/daily-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...config,
          currentTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
          forceRegenerate: true // Forcer la régénération
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Nouveau planning généré:", data.tasks?.length, "tâches")
        // Force React à re-rendre en créant un nouveau tableau
        setTasks([...data.tasks || []])
        setAvailableHours(data.availableHours || 8)
        setHasPlanning(true)
      } else {
        console.error("Erreur génération:", response.status)
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
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
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-balance">Planning du jour</h2>
            <p className="text-sm text-muted-foreground font-normal leading-relaxed mt-1">
              Aujourd'hui, {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
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

      {tasks.length === 0 ? (
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

            return (
              <div key={task.id} className="relative group">
                <Card
                  className={`p-3 border backdrop-blur-sm transition-all ${
                    isBreak ? "bg-accent/5 border-accent/30" :
                    isSuggestion ? "bg-purple-500/5 border-purple-500/30" :
                    isCustomActivity ? "bg-accent/5 border-accent/30" :
                    "bg-card/50 border-border"
                  } ${
                    task.completed ? "opacity-50" : "hover:border-accent/50"
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
}
