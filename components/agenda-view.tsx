"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
  Clock,
  FolderOpen,
} from "lucide-react"

interface UpcomingStep {
  stepId: string
  stepTitle: string
  stepDescription: string
  stepEstimatedDuration: string
  stepStatus: "pending" | "in_progress"
  stepOrderIndex: number
  projectId: string
  projectTitle: string
  projectCategory: string
  projectDeadline: string | null
  projectImageUrl: string | null
}

export function AgendaView() {
  const router = useRouter()
  const [steps, setSteps] = useState<UpcomingStep[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStep, setUpdatingStep] = useState<string | null>(null)

  useEffect(() => {
    fetchSteps()
  }, [])

  async function fetchSteps() {
    try {
      const response = await fetch("/api/agenda")
      if (response.ok) {
        const data = await response.json()
        setSteps(data.steps)
      } else {
        console.error("Erreur lors de la récupération des étapes")
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setLoading(false)
    }
  }

  async function updateStepStatus(
    projectId: string,
    stepId: string,
    newStatus: "pending" | "in_progress" | "completed"
  ) {
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
        // Recharger les étapes
        await fetchSteps()
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
      default:
        return "pending"
    }
  }

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null
    const date = new Date(deadline)
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  // Grouper les étapes par projet
  const groupedSteps = steps.reduce((acc, step) => {
    if (!acc[step.projectId]) {
      acc[step.projectId] = {
        project: {
          id: step.projectId,
          title: step.projectTitle,
          category: step.projectCategory,
          deadline: step.projectDeadline,
          imageUrl: step.projectImageUrl,
        },
        steps: [],
      }
    }
    acc[step.projectId].steps.push(step)
    return acc
  }, {} as Record<string, { project: any; steps: UpcomingStep[] }>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Prochaines étapes</h1>
        <p className="text-muted-foreground font-normal">
          Toutes vos étapes à venir, tous projets confondus
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-border bg-card/50 backdrop-blur-sm">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">Total d'étapes</p>
            <p className="text-3xl font-normal">{steps.length}</p>
          </div>
        </Card>
        <Card className="p-6 border-border bg-blue-500/5 border-blue-500/20 backdrop-blur-sm">
          <div className="space-y-1">
            <p className="text-sm text-blue-500 font-medium">En cours</p>
            <p className="text-3xl font-normal text-blue-500">
              {steps.filter((s) => s.stepStatus === "in_progress").length}
            </p>
          </div>
        </Card>
        <Card className="p-6 border-border bg-card/50 backdrop-blur-sm">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">À faire</p>
            <p className="text-3xl font-normal">
              {steps.filter((s) => s.stepStatus === "pending").length}
            </p>
          </div>
        </Card>
      </div>

      {/* Liste des étapes groupées par projet */}
      {Object.keys(groupedSteps).length === 0 ? (
        <Card className="p-12 border-border bg-card/50 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-xl font-medium">Aucune étape à venir</h3>
              <p className="text-muted-foreground font-normal">
                Toutes vos étapes sont terminées ou vous n'avez pas encore de projet.
              </p>
            </div>
            <Button onClick={() => router.push("/nouveau-projet")} variant="outline">
              Créer un projet
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.values(groupedSteps).map(({ project, steps: projectSteps }) => (
            <div key={project.id} className="space-y-4">
              {/* En-tête du projet */}
              <div
                className="flex items-center gap-4 cursor-pointer group"
                onClick={() => router.push(`/projet/${project.id}`)}
              >
                {project.imageUrl && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={project.imageUrl}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-medium tracking-tight group-hover:text-accent transition-colors">
                      {project.title}
                    </h2>
                    {project.category && (
                      <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-normal">
                        {project.category}
                      </span>
                    )}
                  </div>
                  {project.deadline && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-normal mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>Échéance : {formatDeadline(project.deadline)}</span>
                    </div>
                  )}
                </div>
                <FolderOpen className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>

              {/* Étapes du projet */}
              <div className="space-y-3 pl-20">
                {projectSteps.map((step, index) => (
                  <Card
                    key={step.stepId}
                    className={`p-5 border backdrop-blur-sm transition-all cursor-pointer ${
                      step.stepStatus === "in_progress"
                        ? "bg-blue-500/5 border-blue-500/30"
                        : "bg-card/50 border-border"
                    }`}
                    onClick={() =>
                      updateStepStatus(
                        step.projectId,
                        step.stepId,
                        getNextStatus(step.stepStatus) as any
                      )
                    }
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {updatingStep === step.stepId ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : step.stepStatus === "in_progress" ? (
                          <Circle className="h-5 w-5 text-blue-500 fill-blue-500/20" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-medium">
                            Étape {step.stepOrderIndex + 1}
                          </span>
                          {step.stepEstimatedDuration && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground font-normal">
                                  {step.stepEstimatedDuration}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        <h4 className="font-medium text-lg">{step.stepTitle}</h4>
                        {step.stepDescription && (
                          <p className="text-sm text-muted-foreground font-normal">
                            {step.stepDescription}
                          </p>
                        )}
                      </div>

                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap self-start ${
                          step.stepStatus === "in_progress"
                            ? "bg-blue-500/20 text-blue-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {step.stepStatus === "in_progress" ? "En cours" : "À faire"}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground font-normal text-center pt-4">
        💡 Cliquez sur une étape pour changer son statut
      </p>
    </div>
  )
}
