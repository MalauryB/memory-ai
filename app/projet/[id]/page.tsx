"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ThemeToggle } from "@/components/theme-toggle"
import { ProjectTrackers } from "@/components/project-trackers"
import { ProjectTimelineCalendar } from "@/components/project-timeline-calendar"
import { ArrowLeft, Calendar, Loader2, Pencil } from "lucide-react"
import { getUser } from "@/lib/auth"
import { StepWithSubsteps } from "@/components/step-with-substeps"

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
  start_date: string | null
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
          <h2 className="text-2xl font-medium">Projet introuvable</h2>
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
      <header className="border-b border-border backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <Button variant="ghost" className="font-normal" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* En-tête du projet */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <h1 className="text-4xl font-semibold tracking-tight">{project.title}</h1>
              {project.category && (
                <span className="inline-block text-sm px-3 py-1 rounded-full bg-accent/10 text-accent font-normal">
                  {project.category}
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push(`/projet/${project.id}/modifier`)}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne gauche - Stats et infos principales */}
            <div className="lg:col-span-1 space-y-6">
              {/* Image du projet */}
              {project.image_url && (
                <Card className="overflow-hidden border-border bg-card/50 backdrop-blur-sm">
                  <div className="aspect-video w-full">
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Card>
              )}

              {/* Progression globale */}
              <Card className="p-6 border-border bg-card/50 backdrop-blur-sm">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Progression</h3>
                    <span className="text-3xl font-semibold">
                      {calculatedProgress}
                      <span className="text-lg text-muted-foreground">%</span>
                    </span>
                  </div>
                  <Progress value={calculatedProgress} className="h-2" />
                  <div className="text-sm text-muted-foreground font-normal">
                    {completedSteps} / {totalSteps} étapes complétées
                  </div>
                </div>
              </Card>

              {/* Dates */}
              <Card className="p-6 border-border bg-card/50 backdrop-blur-sm space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dates</h3>

                {project.start_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-normal">Début</span>
                    <span className="text-sm font-medium">{formatDeadline(project.start_date)}</span>
                  </div>
                )}

                {project.deadline && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-normal">Échéance</span>
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDeadline(project.deadline)}
                    </span>
                  </div>
                )}

                {!project.start_date && !project.deadline && (
                  <p className="text-sm text-muted-foreground font-normal italic">Aucune date définie</p>
                )}
              </Card>

              {/* Trackers du projet */}
              <ProjectTrackers
                projectId={projectId}
                projectTitle={project.title}
                projectCategory={project.category}
              />

              {/* Description (discrète) */}
              {project.description && (
                <Card className="p-6 border-border bg-card/50 backdrop-blur-sm space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Description</h3>
                  <p className="text-sm text-muted-foreground font-normal leading-relaxed">
                    {project.description}
                  </p>
                </Card>
              )}
            </div>

            {/* Colonne droite - Timeline et étapes */}
            <div className="lg:col-span-2 space-y-6">
              {/* Calendrier prévisionnel */}
              <ProjectTimelineCalendar
                projectId={projectId}
                projectStartDate={project.start_date || undefined}
                projectDeadline={project.deadline || undefined}
                steps={project.project_steps}
              />

              {/* Liste des étapes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-medium tracking-tight">Étapes du projet</h2>
                  <span className="text-sm text-muted-foreground font-normal">
                    {totalSteps} étape{totalSteps > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-3">
                  {project.project_steps
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((step, index) => (
                      <StepWithSubsteps
                        key={step.id}
                        step={step}
                        stepIndex={index}
                        projectId={projectId}
                        projectTitle={project.title}
                        projectCategory={project.category}
                        onStepStatusChange={fetchProject}
                      />
                    ))}
                </div>

                {project.project_steps.length === 0 && (
                  <Card className="p-8 border-border bg-card/50 backdrop-blur-sm text-center">
                    <p className="text-muted-foreground font-normal">
                      Aucune étape définie pour ce projet
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => router.push(`/projet/${project.id}/modifier`)}
                    >
                      Ajouter des étapes
                    </Button>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
