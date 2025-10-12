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
    <div className="space-y-12 max-w-4xl mx-auto">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-4xl font-semibold tracking-tight text-balance">Planning du jour</h2>
            <p className="text-lg text-muted-foreground font-normal leading-relaxed mt-2">
              Aujourd'hui, {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <PlanningConfigurator onGenerate={generateWithConfig} loading={generating} />
          </div>
        </div>

        {tasks.length > 0 && (
          <p className="text-sm text-muted-foreground font-medium">
            {tasks.filter(t => t.completed).length} / {tasks.length} tâches terminées
          </p>
        )}
      </div>

      {tasks.length === 0 ? (
        <Card className="p-12 border-border bg-card/50 backdrop-blur-sm">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <Sparkles className="h-16 w-16 text-accent" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-medium">Prêt à planifier votre journée ?</h3>
              <p className="text-sm text-muted-foreground font-normal max-w-md mx-auto">
                Générez un planning intelligent adapté à vos projets et votre niveau d'énergie.
              </p>
            </div>
            <PlanningConfigurator onGenerate={generateWithConfig} loading={generating} />
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isBreak = task.itemType === 'break'
            const isSuggestion = task.isSuggested
            const isCustomActivity = task.itemType === 'custom_activity'

            return (
              <div key={task.id} className="relative group">
                <Card
                  className={`p-6 border backdrop-blur-sm transition-all ${
                    isBreak ? "bg-accent/5 border-accent/30" :
                    isSuggestion ? "bg-purple-500/5 border-purple-500/30" :
                    isCustomActivity ? "bg-accent/5 border-accent/30" :
                    "bg-card/50 border-border"
                  } ${
                    task.completed ? "opacity-50" : "hover:border-accent/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                  {!isBreak && (
                    <Checkbox
                      checked={task.completed || false}
                      onCheckedChange={() => toggleTaskCompletion(task.id)}
                      className="rounded-full mt-1"
                    />
                  )}
                  {isBreak && (
                    <div className="flex items-center justify-center w-5 h-5 mt-1">
                      <Coffee className="h-4 w-4 text-accent" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-lg ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </p>
                          {isSuggestion && (
                            <Badge variant="secondary" className="font-normal text-xs">
                              <Lightbulb className="h-3 w-3 mr-1" />
                              Suggestion IA
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground font-normal">
                            {task.description}
                          </p>
                        )}
                        {task.location && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="font-normal">{task.location.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium font-mono">{task.scheduledTime}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs flex-wrap">
                      {task.projectTitle && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <FolderOpen className="h-3 w-3" />
                          <span className="font-normal">{task.projectTitle}</span>
                        </div>
                      )}
                      {task.estimatedDuration && (
                        <span className="text-muted-foreground font-normal">
                          • {task.estimatedDuration}
                        </span>
                      )}
                      {task.projectCategory && (
                        <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-normal">
                          {task.projectCategory}
                        </span>
                      )}
                      {task.itemType === 'tracker' && (
                        <Badge variant="outline" className="font-normal text-xs">
                          Habitude
                        </Badge>
                      )}
                      {isCustomActivity && (
                        <Badge variant="outline" className="font-normal text-xs border-accent/30 text-accent">
                          Activité perso
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                </Card>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="absolute top-4 right-4 p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                  title="Retirer cette tâche du planning"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
