import { SupabaseClient } from "@supabase/supabase-js"

export interface UserContext {
  // Informations personnelles
  fullName?: string
  age?: number
  gender?: string
  location?: string
  timezone?: string
  bio?: string

  // Rythme quotidien
  wakeUpTime?: string
  sleepTime?: string
  morningRoutine?: string
  morningRoutineDuration?: number
  nightRoutine?: string
  nightRoutineDuration?: number

  // Planning de travail
  workHoursStart?: string
  workHoursEnd?: string
  preferredWorkDays?: number[]
  dailyWorkHours?: number

  // Créneaux bloqués
  blockedTimeSlots?: Array<{
    title: string
    description?: string
    startTime: string
    endTime: string
    daysOfWeek: number[]
  }>
}

/**
 * Récupère le contexte complet de l'utilisateur pour enrichir les prompts IA
 */
export async function getUserContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserContext> {
  // Récupérer le profil utilisateur
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single()

  // Récupérer les créneaux bloqués
  const { data: blockedSlots } = await supabase
    .from("user_blocked_time_slots")
    .select("*")
    .eq("user_id", userId)

  // Calculer l'âge si date de naissance disponible
  let age: number | undefined
  if (profile?.birth_date) {
    const birthDate = new Date(profile.birth_date)
    const today = new Date()
    age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
  }

  // Mapper les labels de genre
  const genderLabels: Record<string, string> = {
    male: "homme",
    female: "femme",
    non_binary: "personne non-binaire",
    other: "personne",
    prefer_not_to_say: "personne"
  }

  return {
    fullName: profile?.full_name,
    age,
    gender: profile?.gender ? genderLabels[profile.gender] : undefined,
    location: profile?.location,
    timezone: profile?.timezone,
    bio: profile?.bio,
    wakeUpTime: profile?.wake_up_time?.substring(0, 5),
    sleepTime: profile?.sleep_time?.substring(0, 5),
    morningRoutine: profile?.morning_routine,
    morningRoutineDuration: profile?.morning_routine_duration,
    nightRoutine: profile?.night_routine,
    nightRoutineDuration: profile?.night_routine_duration,
    workHoursStart: profile?.work_hours_start?.substring(0, 5),
    workHoursEnd: profile?.work_hours_end?.substring(0, 5),
    preferredWorkDays: profile?.preferred_work_days,
    dailyWorkHours: profile?.daily_work_hours,
    blockedTimeSlots: blockedSlots?.map((slot) => ({
      title: slot.title,
      description: slot.description,
      startTime: slot.start_time.substring(0, 5),
      endTime: slot.end_time.substring(0, 5),
      daysOfWeek: slot.days_of_week
    }))
  }
}

/**
 * Formate le contexte utilisateur en texte lisible pour les prompts IA
 */
export function formatUserContextForAI(context: UserContext): string {
  const parts: string[] = []

  // Informations personnelles
  if (context.fullName || context.age || context.gender) {
    const infos: string[] = []
    if (context.fullName) infos.push(context.fullName)
    if (context.age) infos.push(`${context.age} ans`)
    if (context.gender) infos.push(context.gender)
    parts.push(`👤 Utilisateur : ${infos.join(", ")}`)
  }

  if (context.location) {
    parts.push(`📍 Localisation : ${context.location}`)
  }

  if (context.bio) {
    parts.push(`📝 Bio : ${context.bio}`)
  }

  // Rythme quotidien
  if (context.wakeUpTime || context.sleepTime) {
    const schedule: string[] = []
    if (context.wakeUpTime) schedule.push(`Lever à ${context.wakeUpTime}`)
    if (context.sleepTime) schedule.push(`Coucher à ${context.sleepTime}`)
    parts.push(`⏰ Rythme quotidien : ${schedule.join(", ")}`)
  }

  // Routines
  if (context.morningRoutine) {
    parts.push(`🌅 Routine matinale (${context.morningRoutineDuration || 30}min) : ${context.morningRoutine}`)
  }

  if (context.nightRoutine) {
    parts.push(`🌙 Routine du soir (${context.nightRoutineDuration || 30}min) : ${context.nightRoutine}`)
  }

  // Planning de travail
  if (context.workHoursStart || context.workHoursEnd) {
    const workInfo: string[] = []
    if (context.workHoursStart && context.workHoursEnd) {
      workInfo.push(`${context.workHoursStart} - ${context.workHoursEnd}`)
    }
    if (context.dailyWorkHours) {
      workInfo.push(`${context.dailyWorkHours}h/jour`)
    }
    parts.push(`💼 Horaires de travail : ${workInfo.join(", ")}`)
  }

  if (context.preferredWorkDays && context.preferredWorkDays.length > 0) {
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
    const workDays = context.preferredWorkDays.map((d) => dayNames[d]).join(", ")
    parts.push(`📅 Jours de travail préférés : ${workDays}`)
  }

  // Créneaux bloqués
  if (context.blockedTimeSlots && context.blockedTimeSlots.length > 0) {
    parts.push(`🚫 Créneaux bloqués :`)
    context.blockedTimeSlots.forEach((slot) => {
      const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
      const days = slot.daysOfWeek.map((d) => dayNames[d]).join(", ")
      parts.push(`  - ${slot.title} : ${slot.startTime}-${slot.endTime} (${days})${slot.description ? ` - ${slot.description}` : ""}`)
    })
  }

  return parts.length > 0 ? parts.join("\n") : ""
}

/**
 * Retourne une chaîne de recommandations basée sur le contexte utilisateur
 */
export function getUserRecommendations(context: UserContext): string {
  const recommendations: string[] = []

  // Recommandations basées sur les horaires
  if (context.wakeUpTime) {
    const wakeHour = parseInt(context.wakeUpTime.split(":")[0])
    if (wakeHour <= 6) {
      recommendations.push("L'utilisateur est matinal, privilégier les tâches importantes tôt le matin")
    } else if (wakeHour >= 9) {
      recommendations.push("L'utilisateur se lève tard, ne pas planifier d'activités trop tôt")
    }
  }

  // Recommandations basées sur les routines
  if (context.morningRoutine && context.morningRoutineDuration) {
    recommendations.push(`Réserver ${context.morningRoutineDuration}min après le lever pour la routine matinale`)
  }

  if (context.nightRoutine && context.nightRoutineDuration) {
    recommendations.push(`Réserver ${context.nightRoutineDuration}min avant le coucher pour la routine du soir`)
  }

  // Recommandations basées sur les créneaux bloqués
  if (context.blockedTimeSlots && context.blockedTimeSlots.length > 0) {
    recommendations.push("Éviter de planifier des tâches pendant les créneaux bloqués mentionnés ci-dessus")
  }

  return recommendations.length > 0 ? `\n⚡ Recommandations :\n${recommendations.map((r) => `- ${r}`).join("\n")}` : ""
}
