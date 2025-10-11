"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, Plus, Activity, AlertCircle, Sparkles } from "lucide-react"
import { TrackerCard } from "@/components/tracker-card"
import { CreateTrackerDialog } from "@/components/create-tracker-dialog"
import { Tracker } from "@/types/tracker"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProjectTrackersProps {
  projectId: string
  projectTitle: string
  projectCategory: string
}

export function ProjectTrackers({ projectId, projectTitle, projectCategory }: ProjectTrackersProps) {
  const [trackers, setTrackers] = useState<Tracker[]>([])
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchProjectTrackers()
    fetchCompletionsToday()
  }, [projectId])

  async function fetchProjectTrackers() {
    try {
      const response = await fetch(`/api/projects/${projectId}/trackers`)
      if (response.ok) {
        const data = await response.json()
        setTrackers(data.trackers || [])
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des trackers:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCompletionsToday() {
    try {
      const today = new Date().toISOString().split("T")[0]
      const response = await fetch(`/api/trackers/completions?date=${today}`)
      if (response.ok) {
        const data = await response.json()
        const completedIds = new Set(data.completions?.map((c: any) => c.tracker_id) || [])
        setCompletedToday(completedIds)
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des complétions:", error)
    }
  }

  async function handleGenerateTrackers() {
    setGenerating(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/generate-trackers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_title: projectTitle,
          project_category: projectCategory,
        }),
      })

      if (response.ok) {
        // Rafraîchir la liste des trackers
        await fetchProjectTrackers()
      } else {
        console.error("Erreur lors de la génération des trackers")
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setGenerating(false)
    }
  }

  async function handleComplete(trackerId: string, date: string) {
    try {
      const response = await fetch("/api/trackers/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracker_id: trackerId, completion_date: date }),
      })

      if (response.ok) {
        setCompletedToday((prev) => new Set([...prev, trackerId]))
        fetchProjectTrackers() // Rafraîchir pour mettre à jour les stats
      }
    } catch (error) {
      console.error("Erreur lors de la complétion du tracker:", error)
    }
  }

  async function handleDelete(trackerId: string) {
    try {
      const response = await fetch(`/api/trackers/${trackerId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Rafraîchir la liste des trackers
        await fetchProjectTrackers()
      } else {
        console.error("Erreur lors de la suppression du tracker")
      }
    } catch (error) {
      console.error("Erreur:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-light tracking-tight">Trackers du projet</h2>
          <p className="text-sm text-muted-foreground font-light">
            Suivez les habitudes et tâches récurrentes liées à ce projet
          </p>
        </div>

        <div className="flex items-center gap-2">
          {trackers.length === 0 ? (
            <Button onClick={handleGenerateTrackers} disabled={generating} className="font-light">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer avec IA
                </>
              )}
            </Button>
          ) : (
            <>
              <CreateTrackerDialog
                projectId={projectId}
                onTrackerCreated={fetchProjectTrackers}
              />
              <Button onClick={handleGenerateTrackers} disabled={generating} variant="outline" className="font-light">
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Générer avec IA
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {trackers.length === 0 ? (
        <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Activity className="h-6 w-6 text-accent" />
          </div>
          <h3 className="text-lg font-light mb-2">Aucun tracker pour ce projet</h3>
          <p className="text-sm text-muted-foreground font-light mb-4">
            Générez automatiquement des trackers basés sur les étapes de votre projet pour suivre votre progression
            quotidienne.
          </p>
          <Button onClick={handleGenerateTrackers} disabled={generating} variant="outline" className="font-light">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Générer maintenant
              </>
            )}
          </Button>
        </Card>
      ) : (
        <>
          <Alert className="border-accent/50 bg-accent/5">
            <AlertCircle className="h-4 w-4 text-accent" />
            <AlertDescription className="text-sm font-light">
              Ces trackers ont été générés à partir des étapes de votre projet. Marquez-les comme complétés chaque jour
              pour maintenir votre progression.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trackers.map((tracker) => (
              <TrackerCard
                key={tracker.id}
                tracker={tracker}
                onComplete={handleComplete}
                onDelete={handleDelete}
                isCompletedToday={completedToday.has(tracker.id)}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <CreateTrackerDialog
              projectId={projectId}
              onTrackerCreated={fetchProjectTrackers}
            />
          </div>
        </>
      )}
    </div>
  )
}
