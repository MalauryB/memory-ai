// Types pour le système de tracker d'habitudes
// Les trackers sont maintenant des project_substeps avec tracking_enabled = true

export type TrackerFrequency = "once" | "daily" | "every_x_days" | "weekly" | "monthly" | "custom"

export interface Tracker {
  id: string
  user_id: string
  project_id?: string | null // Lien vers le projet source
  title: string
  description: string
  category: string
  icon?: string
  color?: string

  // Configuration de la répétition
  frequency: TrackerFrequency
  frequency_value: number // Ex: tous les X jours (pour "every_x_days")
  target_days?: number[] // Pour hebdomadaire: [0,1,2,3,4,5,6] (0 = dimanche)

  // Dates
  start_date: string
  end_date?: string | null

  // Statistiques
  total_completions: number
  current_streak: number
  best_streak: number

  // Métadonnées
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface TrackerCompletion {
  id: string
  tracker_id: string
  completion_date: string // Format: YYYY-MM-DD
  completed_at: string // Timestamp complet
  notes?: string
  created_at: string
}

export interface TrackerStats {
  tracker_id: string
  total_completions: number
  current_streak: number
  best_streak: number
  completion_rate: number // Pourcentage de complétion sur la période
  last_completion_date?: string
  next_scheduled_date: string
}

export interface TrackerCalendarDay {
  date: string
  completed: boolean
  is_scheduled: boolean // Si ce jour est prévu selon la fréquence
  completion?: TrackerCompletion
}

// Type pour créer un nouveau tracker
export type CreateTrackerInput = Omit<
  Tracker,
  "id" | "user_id" | "total_completions" | "current_streak" | "best_streak" | "created_at" | "updated_at"
>

// Type pour mettre à jour un tracker
export type UpdateTrackerInput = Partial<CreateTrackerInput>
