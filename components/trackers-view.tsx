"use client"

import { useState } from "react"
import useSWR from "swr"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Activity } from "lucide-react"
import { TrackerCard } from "@/components/tracker-card"
import { Tracker } from "@/types/tracker"

export function TrackersView() {
  const t = useTranslations('trackers')
  const tCommon = useTranslations('common')
  // ⚡ OPTIMISATION : Une seule requête avec SWR
  const { data, error, isLoading, mutate: refreshTrackers } = useSWR("/api/trackers", {
    refreshInterval: 30000, // Revalider toutes les 30 secondes
    keepPreviousData: true,
  })

  const trackers = data?.trackers || []
  const completedTodayIds = new Set(data?.completedToday || [])

  async function handleComplete(trackerId: string, date: string) {
    // ⚡ OPTIMISATION : Mutation optimiste - Mettre à jour l'UI immédiatement
    const newCompletedToday = [...(data?.completedToday || []), trackerId]
    const optimisticData = {
      ...data,
      completedToday: newCompletedToday,
      trackers: trackers.map((t: Tracker) =>
        t.id === trackerId
          ? {
              ...t,
              completed_today: true,
              total_completions: t.total_completions + 1,
              current_streak: t.current_streak + 1,
            }
          : t
      ),
    }

    // Mettre à jour le cache immédiatement
    await refreshTrackers(optimisticData, false)

    try {
      const response = await fetch("/api/trackers/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracker_id: trackerId, completion_date: date }),
      })

      if (!response.ok) {
        // En cas d'erreur, revalider pour récupérer l'état correct
        refreshTrackers()
      }
    } catch (error) {
      console.error("Erreur lors de la complétion du tracker:", error)
      // Revalider en cas d'erreur
      refreshTrackers()
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Séparer les trackers actifs et complétés aujourd'hui
  const activeTrackers = trackers.filter((t: Tracker) => t.is_active)
  const todayTrackers = activeTrackers.filter((t: Tracker) => !t.completed_today)
  const completedTrackers = activeTrackers.filter((t: Tracker) => t.completed_today)

  if (trackers.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
          <Activity className="h-8 w-8 text-accent" />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-medium tracking-tight">{t('noTrackers')}</h3>
          <p className="text-muted-foreground font-normal">
            {t('noTrackersDesc')}
          </p>
        </div>
        <Button onClick={handleCreateTracker} className="font-normal">
          <Plus className="h-4 w-4 mr-2" />
          {t('createTracker')}
        </Button>
      </div>
    )
  }

  // Calculer les statistiques globales
  const totalCompletionsToday = completedTrackers.length
  const totalActiveTrackers = activeTrackers.length
  const completionRate = totalActiveTrackers > 0 ? Math.round((totalCompletionsToday / totalActiveTrackers) * 100) : 0

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-semibold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground font-normal">
            {t('subtitle', { count: totalActiveTrackers })}
          </p>
        </div>
        <Button onClick={handleCreateTracker} className="font-normal">
          <Plus className="h-4 w-4 mr-2" />
          {t('newTracker')}
        </Button>
      </div>

      {/* Statistiques du jour */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-normal">{t('completedToday')}:</span>
          <span className="font-medium">
            {totalCompletionsToday}/{totalActiveTrackers}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-normal">{t('completionRate')}:</span>
          <span className="font-medium">{completionRate}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-normal">{t('bestStreak')}:</span>
          <span className="font-medium">{Math.max(...activeTrackers.map((t) => t.best_streak), 0)}</span>
        </div>
      </div>

      {/* Liste des trackers à faire aujourd'hui */}
      {todayTrackers.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-medium tracking-tight">{t('todoToday')}</h3>
          <div className="space-y-2">
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
        <section className="space-y-3">
          <h3 className="text-lg font-medium tracking-tight text-muted-foreground">{t('completedList')}</h3>
          <div className="space-y-2">
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
