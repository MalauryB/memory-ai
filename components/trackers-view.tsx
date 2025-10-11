"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Activity } from "lucide-react"
import { TrackerCard } from "@/components/tracker-card"
import { Tracker } from "@/types/tracker"

export function TrackersView() {
  const [trackers, setTrackers] = useState<Tracker[]>([])
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrackers()
    fetchCompletionsToday()
  }, [])

  async function fetchTrackers() {
    try {
      const response = await fetch("/api/trackers")
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

  async function handleComplete(trackerId: string, date: string) {
    try {
      const response = await fetch("/api/trackers/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracker_id: trackerId, completion_date: date }),
      })

      if (response.ok) {
        // Mettre à jour l'état local
        setCompletedToday((prev) => new Set([...prev, trackerId]))

        // Rafraîchir les trackers pour mettre à jour les statistiques
        fetchTrackers()
      }
    } catch (error) {
      console.error("Erreur lors de la complétion du tracker:", error)
    }
  }

  function handleCreateTracker() {
    // TODO: Implémenter la navigation vers le formulaire de création
    console.log("Créer un nouveau tracker")
  }

  function handleTrackerClick(trackerId: string) {
    // TODO: Implémenter la navigation vers les détails du tracker
    console.log("Ouvrir le tracker:", trackerId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Séparer les trackers actifs et complétés aujourd'hui
  const activeTrackers = trackers.filter((t) => t.is_active)
  const todayTrackers = activeTrackers.filter((t) => !completedToday.has(t.id))
  const completedTrackers = activeTrackers.filter((t) => completedToday.has(t.id))

  if (trackers.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
          <Activity className="h-8 w-8 text-accent" />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-light tracking-tight">Aucun tracker pour le moment</h3>
          <p className="text-muted-foreground font-light">
            Créez votre premier tracker pour suivre vos habitudes et objectifs récurrents.
          </p>
        </div>
        <Button onClick={handleCreateTracker} className="font-light">
          <Plus className="h-4 w-4 mr-2" />
          Créer un tracker
        </Button>
      </div>
    )
  }

  // Calculer les statistiques globales
  const totalCompletionsToday = completedToday.size
  const totalActiveTrackers = activeTrackers.length
  const completionRate = totalActiveTrackers > 0 ? Math.round((totalCompletionsToday / totalActiveTrackers) * 100) : 0

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-light tracking-tight">Mes trackers</h2>
          <p className="text-muted-foreground font-light">
            {totalActiveTrackers} tracker{totalActiveTrackers > 1 ? "s" : ""} actif{totalActiveTrackers > 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleCreateTracker} className="font-light">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau tracker
        </Button>
      </div>

      {/* Statistiques du jour */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        <div className="p-6 border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-light">Complétés aujourd'hui</p>
            <p className="text-3xl font-light">
              {totalCompletionsToday}/{totalActiveTrackers}
            </p>
          </div>
        </div>

        <div className="p-6 border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-light">Taux de complétion</p>
            <p className="text-3xl font-light">
              {completionRate}
              <span className="text-lg text-muted-foreground">%</span>
            </p>
          </div>
        </div>

        <div className="p-6 border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-light">Série la plus longue</p>
            <p className="text-3xl font-light">{Math.max(...activeTrackers.map((t) => t.best_streak), 0)}</p>
          </div>
        </div>
      </div>

      {/* Liste des trackers à faire aujourd'hui */}
      {todayTrackers.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-light tracking-tight">À faire aujourd'hui</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayTrackers.map((tracker) => (
              <TrackerCard
                key={tracker.id}
                tracker={tracker}
                onComplete={handleComplete}
                onClick={() => handleTrackerClick(tracker.id)}
                isCompletedToday={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Liste des trackers complétés aujourd'hui */}
      {completedTrackers.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-light tracking-tight text-muted-foreground">Complétés aujourd'hui</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedTrackers.map((tracker) => (
              <TrackerCard
                key={tracker.id}
                tracker={tracker}
                onClick={() => handleTrackerClick(tracker.id)}
                isCompletedToday={true}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
