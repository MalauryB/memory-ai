"use client"

import { useState, useMemo, useCallback } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
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
  const t = useTranslations('agenda')
  const tCommon = useTranslations('common')
  const [updatingStep, setUpdatingStep] = useState<string | null>(null)

  // ⚡ OPTIMISATION : Utiliser SWR pour le cache automatique
  const { data, error, isLoading, mutate: refreshSteps } = useSWR("/api/agenda", {
    refreshInterval: 30000, // Revalider toutes les 30 secondes
    keepPreviousData: true,
  })

  const steps = data?.steps || []

  const updateStepStatus = useCallback(async (
    projectId: string,
    stepId: string,
    newStatus: "pending" | "in_progress" | "completed"
  ) => {
    setUpdatingStep(stepId)

    // ⚡ OPTIMISATION : Mutation optimiste
    const optimisticSteps = steps.map((step: UpcomingStep) =>
      step.stepId === stepId ? { ...step, stepStatus: newStatus } : step
    ).filter((step: UpcomingStep) => step.stepStatus !== "completed") // Retirer si complété

    // Mettre à jour le cache immédiatement
    await refreshSteps({ steps: optimisticSteps }, false)

    try {
      const response = await fetch(`/api/projects/${projectId}/steps/${stepId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        // En cas d'erreur, revalider
        refreshSteps()
      }
    } catch (error) {
      console.error("Erreur:", error)
      // Revalider en cas d'erreur
      refreshSteps()
    } finally {
      setUpdatingStep(null)
    }
  }, [steps, refreshSteps])

  const getNextStatus = useCallback((currentStatus: string) => {
    switch (currentStatus) {
      case "pending":
        return "in_progress"
      case "in_progress":
        return "completed"
      default:
        return "pending"
    }
  }, [])

  const formatDeadline = useCallback((deadline: string | null) => {
    if (!deadline) return null
    const date = new Date(deadline)
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }, [])

  // ⚡ OPTIMISATION : Memoïzer le groupement des étapes
  const groupedSteps = useMemo(() => steps.reduce((acc, step) => {
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
  }, {} as Record<string, { project: any; steps: UpcomingStep[] }>), [steps])

  if (isLoading) {
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
        <h1 className="text-4xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground font-normal">
          {t('subtitle')}
        </p>
      </div>

      {/* Liste des étapes groupées par projet */}
      {Object.keys(groupedSteps).length === 0 ? (
        <Card className="p-12 border-border bg-card/50 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-xl font-medium">{t('noSteps')}</h3>
              <p className="text-muted-foreground font-normal">
                {t('noStepsDesc')}
              </p>
            </div>
            <Button onClick={() => router.push("/nouveau-projet")} variant="outline">
              {t('createProject')}
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
                      <span>{t('deadline', { date: formatDeadline(project.deadline) })}</span>
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
                        ? "bg-accent/5 border-accent/30"
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
                          <Circle className="h-5 w-5 text-accent fill-accent/20" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-medium">
                            {t('step', { index: step.stepOrderIndex + 1 })}
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
                            ? "bg-accent/20 text-accent"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {step.stepStatus === "in_progress" ? t('inProgress') : t('todo')}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
