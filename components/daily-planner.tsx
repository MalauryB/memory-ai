"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, Loader2, Sparkles, FolderOpen } from "lucide-react"

interface DailyTask {
  id: string
  title: string
  description: string
  estimatedDuration: string
  scheduledTime: string
  projectTitle: string
  projectCategory: string
  substepId: string
  stepId: string
  projectId: string
  priority: number
  completed?: boolean
}

export function DailyPlanner() {
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [availableHours, setAvailableHours] = useState(8)

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
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleTaskCompletion(taskId: string) {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    )
  }

  async function regeneratePlan() {
    setGenerating(true)
    await fetchDailyPlan()
    setGenerating(false)
  }

  if (loading) {
    return (
      <div className="space-y-12 max-w-3xl">
        <div className="space-y-4">
          <h2 className="text-4xl font-light tracking-tight text-balance">Planning du jour</h2>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12 max-w-3xl">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-4xl font-light tracking-tight text-balance">Planning du jour</h2>
            <p className="text-lg text-muted-foreground font-light leading-relaxed mt-2">
              Aujourd'hui, {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={regeneratePlan}
            disabled={generating}
            className="flex-shrink-0"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Régénérer
              </>
            )}
          </Button>
        </div>

        {tasks.length > 0 && (
          <p className="text-sm text-muted-foreground font-light">
            {tasks.filter(t => t.completed).length} / {tasks.length} tâches terminées
          </p>
        )}
      </div>

      {tasks.length === 0 ? (
        <Card className="p-12 border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-light">Aucune tâche planifiée</h3>
              <p className="text-sm text-muted-foreground font-light max-w-md mx-auto">
                Créez des projets et décomposez-les en étapes pour générer automatiquement votre planning du jour.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className={`p-6 border-border/50 bg-card/50 backdrop-blur-sm transition-all ${
                task.completed ? "opacity-50" : "hover:border-accent/50"
              }`}
            >
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={task.completed || false}
                  onCheckedChange={() => toggleTaskCompletion(task.id)}
                  className="rounded-full mt-1"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <p className={`font-light text-lg ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground font-light">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-light font-mono">{task.scheduledTime}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FolderOpen className="h-3 w-3" />
                      <span className="font-light">{task.projectTitle}</span>
                    </div>
                    {task.estimatedDuration && (
                      <span className="text-muted-foreground font-light">
                        • {task.estimatedDuration}
                      </span>
                    )}
                    <span
                      className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-light"
                    >
                      {task.projectCategory}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
