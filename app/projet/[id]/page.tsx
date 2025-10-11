"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Calendar, CheckCircle2, Circle, Loader2, Pencil } from "lucide-react"
import { getUser } from "@/lib/auth"

interface ProjectStep {
  id: string
  title: string
  description: string
  estimated_duration: string
  status: "pending" | "in_progress" | "completed"
  order_index: number
}

interface Project {
  id: string
  title: string
  description: string
  category: string
  deadline: string | null
  image_url: string | null
  progress: number
  status: string
  created_at: string
  project_steps: ProjectStep[]
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStep, setUpdatingStep] = useState<string | null>(null)

  useEffect(() => {
    checkUserAndFetchProject()
  }, [projectId])

  async function checkUserAndFetchProject() {
    const user = await getUser()
    if (!user) {
      router.push("/auth")
      return
    }
    await fetchProject()
  }

  async function fetchProject() {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
      } else {
        console.error("Erreur lors de la récupération du projet")
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setLoading(false)
    }
  }

  async function updateStepStatus(stepId: string, newStatus: "pending" | "in_progress" | "completed") {
    setUpdatingStep(stepId)
    try {
      const response = await fetch(`/api/projects/${projectId}/steps/${stepId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Recharger le projet
        await fetchProject()
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setUpdatingStep(null)
    }
  }

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "pending":
        return "in_progress"
      case "in_progress":
        return "completed"
      case "completed":
        return "pending"
      default:
        return "pending"
    }
  }

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null
    const date = new Date(deadline)
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-light">Projet introuvable</h2>
          <Button onClick={() => router.push("/")} variant="outline">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    )
  }

  const completedSteps = project.project_steps.filter((s) => s.status === "completed").length
  const totalSteps = project.project_steps.length
  const calculatedProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <Button variant="ghost" className="font-light" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* En-tête du projet */}
          <div className="space-y-6">
            {project.image_url && (
              <div className="w-full h-64 rounded-lg overflow-hidden">
                <img
                  src={project.image_url}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-light tracking-tight">{project.title}</h1>
                  {project.category && (
                    <span className="inline-block text-sm px-3 py-1 rounded-full bg-accent/10 text-accent font-light">
                      {project.category}
                    </span>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/projet/${project.id}/modifier`)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              </div>

              <p className="text-lg text-muted-foreground font-light leading-relaxed">
                {project.description}
              </p>

              {project.deadline && (
                <div className="flex items-center gap-2 text-muted-foreground font-light">
                  <Calendar className="h-4 w-4" />
                  <span>Échéance : {formatDeadline(project.deadline)}</span>
                </div>
              )}
            </div>

            {/* Progression globale */}
            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-light">Progression globale</h3>
                  <span className="text-3xl font-light">
                    {calculatedProgress}
                    <span className="text-lg text-muted-foreground">%</span>
                  </span>
                </div>
                <Progress value={calculatedProgress} className="h-2" />
                <div className="flex items-center justify-between text-sm text-muted-foreground font-light">
                  <span>{completedSteps} sur {totalSteps} étapes complétées</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Liste des étapes */}
          <div className="space-y-4">
            <h2 className="text-2xl font-light tracking-tight">Étapes du projet</h2>

            <div className="space-y-3">
              {project.project_steps
                .sort((a, b) => a.order_index - b.order_index)
                .map((step, index) => (
                  <Card
                    key={step.id}
                    className={`p-6 border-border/50 backdrop-blur-sm transition-all cursor-pointer ${
                      step.status === "completed"
                        ? "bg-accent/5 border-accent/20"
                        : step.status === "in_progress"
                        ? "bg-card/50 border-accent/50"
                        : "bg-card/50"
                    }`}
                    onClick={() => updateStepStatus(step.id, getNextStatus(step.status) as any)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {updatingStep === step.id ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : step.status === "completed" ? (
                          <CheckCircle2 className="h-6 w-6 text-accent" />
                        ) : step.status === "in_progress" ? (
                          <Circle className="h-6 w-6 text-accent fill-accent/20" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-light">
                                Étape {index + 1}
                              </span>
                              {step.estimated_duration && (
                                <span className="text-xs text-muted-foreground font-light">
                                  • {step.estimated_duration}
                                </span>
                              )}
                            </div>
                            <h4
                              className={`font-light text-lg ${
                                step.status === "completed"
                                  ? "text-muted-foreground line-through"
                                  : ""
                              }`}
                            >
                              {step.title}
                            </h4>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-light whitespace-nowrap ${
                              step.status === "completed"
                                ? "bg-accent/20 text-accent"
                                : step.status === "in_progress"
                                ? "bg-blue-500/20 text-blue-500"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {step.status === "completed"
                              ? "Terminé"
                              : step.status === "in_progress"
                              ? "En cours"
                              : "À faire"}
                          </span>
                        </div>

                        {step.description && (
                          <p
                            className={`text-sm font-light ${
                              step.status === "completed"
                                ? "text-muted-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
            </div>

            <p className="text-sm text-muted-foreground font-light text-center pt-4">
              💡 Cliquez sur une étape pour changer son statut
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
