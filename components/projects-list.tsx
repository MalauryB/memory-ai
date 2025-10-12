"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Calendar, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface ProjectStep {
  id: string
  title: string
  description: string
  estimated_duration: string
  status: string
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

export function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const response = await fetch("/api/projects")
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des projets:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null

    const date = new Date(deadline)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return "Échéance dépassée"
    } else if (diffDays === 0) {
      return "Aujourd'hui"
    } else if (diffDays === 1) {
      return "Demain"
    } else if (diffDays < 30) {
      return `${diffDays} jours restants`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} mois restant${months > 1 ? "s" : ""}`
    } else {
      const years = Math.floor(diffDays / 365)
      return `${years} an${years > 1 ? "s" : ""} restant${years > 1 ? "s" : ""}`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
        <div className="space-y-3">
          <h3 className="text-2xl font-medium tracking-tight">Aucun projet pour le moment</h3>
          <p className="text-muted-foreground font-normal">
            Créez votre premier projet de vie et commencez à architecturer votre avenir.
          </p>
        </div>
        <Button onClick={() => router.push("/nouveau-projet")} className="font-normal">
          <Plus className="h-4 w-4 mr-2" />
          Créer un projet
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-semibold tracking-tight">Mes projets</h2>
          <p className="text-muted-foreground font-normal">
            {projects.length} projet{projects.length > 1 ? "s" : ""} en cours
          </p>
        </div>
        <Button onClick={() => router.push("/nouveau-projet")} className="font-normal">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau projet
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="overflow-hidden border-border bg-card/50 backdrop-blur-sm hover:border-accent/50 transition-all cursor-pointer group"
            onClick={() => router.push(`/projet/${project.id}`)}
          >
            {project.image_url && (
              <div className="w-full h-32 overflow-hidden">
                <img
                  src={project.image_url}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-base leading-tight group-hover:text-accent transition-colors">
                    {project.title}
                  </h3>
                  {project.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-normal whitespace-nowrap">
                      {project.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-normal line-clamp-2">
                  {project.description}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-normal">Progression</span>
                  <span className="font-normal">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-1" />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground font-normal">
                <span>{project.project_steps?.length || 0} étapes</span>
                {formatDeadline(project.deadline) && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDeadline(project.deadline)}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
