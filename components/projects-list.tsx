"use client"

import { useRouter } from "next/navigation"
import { memo, useMemo, useCallback } from "react"
import useSWR from "swr"
import { useTranslations } from "next-intl"
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

// ⚡ OPTIMISATION : Memo pour éviter re-renders inutiles
export const ProjectsList = memo(function ProjectsList() {
  const router = useRouter()
  const t = useTranslations('projects')
  const tCommon = useTranslations('common')

  // ⚡ OPTIMISATION : Utiliser SWR pour le cache automatique
  const { data, error, isLoading } = useSWR("/api/projects", {
    // Revalider toutes les 30 secondes
    refreshInterval: 30000,
    // Garder les données précédentes pendant le rechargement
    keepPreviousData: true,
  })

  const projects = data?.projects || []

  // ⚡ OPTIMISATION : Memoizer la fonction de formatage
  const formatDeadline = useCallback((deadline: string | null) => {
    if (!deadline) return null

    const date = new Date(deadline)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return t('deadlineExceeded')
    } else if (diffDays === 0) {
      return t('today')
    } else if (diffDays === 1) {
      return t('tomorrow')
    } else if (diffDays < 30) {
      return t('daysRemaining', { count: diffDays })
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return t('monthsRemaining', { count: months })
    } else {
      const years = Math.floor(diffDays / 365)
      return t('yearsRemaining', { count: years })
    }
  }, [t])

  if (isLoading) {
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
          <h3 className="text-2xl font-medium tracking-tight">{t('noProjects')}</h3>
          <p className="text-muted-foreground font-normal">
            {t('noProjectsDesc')}
          </p>
        </div>
        <Button onClick={() => router.push("/nouveau-projet")} className="font-normal">
          <Plus className="h-4 w-4 mr-2" />
          {t('createProject')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-semibold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground font-normal">
            {t('subtitle', { count: projects.length })}
          </p>
        </div>
        <Button onClick={() => router.push("/nouveau-projet")} className="font-normal">
          <Plus className="h-4 w-4 mr-2" />
          {t('newProject')}
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
                  <span className="text-muted-foreground font-normal">{t('progress')}</span>
                  <span className="font-normal">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-1" />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground font-normal">
                <span>{t('steps', { count: project.project_steps?.length || 0 })}</span>
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
})
