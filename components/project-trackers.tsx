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
    <Card className="p-6 border-border bg-card/50 backdrop-blur-sm space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Trackers</h3>
        <p className="text-xs text-muted-foreground font-normal">
          Suivez vos habitudes liées à ce projet
        </p>
      </div>

      {trackers.length === 0 ? (
        <div className="text-center py-6 space-y-3">
          <div className="mx-auto w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <Activity className="h-5 w-5 text-accent" />
          </div>
          <p className="text-xs text-muted-foreground font-normal">
            Aucun tracker pour ce projet
          </p>
          <Button
            onClick={handleGenerateTrackers}
            disabled={generating}
            size="sm"
            variant="outline"
            className="font-normal w-full"
          >
            {generating ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-2" />
                Générer avec IA
              </>
            )}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
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

          <div className="flex flex-col gap-2 pt-2">
            <CreateTrackerDialog
              projectId={projectId}
              onTrackerCreated={fetchProjectTrackers}
            />
            <Button
              onClick={handleGenerateTrackers}
              disabled={generating}
              variant="outline"
              size="sm"
              className="font-normal w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-2" />
                  Générer plus
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
