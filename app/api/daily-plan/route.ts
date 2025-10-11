import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

interface ProjectSubstep {
  id: string
  title: string
  description: string
  status: string
  estimated_duration: string
  scheduled_date: string | null
  order_index: number
  project_id: string
  step_id: string
  project_title?: string
  project_category?: string
}

interface DailyPlanTask {
  id: string
  title: string
  description: string
  estimatedDuration: string
  scheduledTime: string
  projectTitle: string
  projectCategory: string
  substepId: string
  stepId: string
  projectId: string
  priority: number
}

// GET - Générer le planning du jour basé sur les substeps et les disponibilités
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const today = new Date().toISOString().split("T")[0]

    // 1. Récupérer le profil utilisateur pour les disponibilités
    let userProfile = null
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()
      userProfile = profile
    }

    // Paramètres par défaut si pas de profil
    const workHoursStart = userProfile?.work_hours_start || "09:00:00"
    const workHoursEnd = userProfile?.work_hours_end || "18:00:00"
    const dailyWorkHours = userProfile?.daily_work_hours || 8

    // 2. Récupérer tous les projets actifs de l'utilisateur
    const { data: projects } = await supabase
      .from("projects")
      .select("id, title, category, priority, due_date")
      .eq("user_id", user?.id || null)
      .in("status", ["active", "in_progress"])
      .order("priority", { ascending: false })

    if (!projects || projects.length === 0) {
      return NextResponse.json({ tasks: [], availableHours: dailyWorkHours })
    }

    // 3. Récupérer toutes les substeps de ces projets
    const projectIds = projects.map((p) => p.id)
    const { data: substeps } = await supabase
      .from("project_substeps")
      .select("*, project_steps(project_id, title)")
      .in("project_id", projectIds)
      .in("status", ["pending", "in_progress"])
      .order("scheduled_date", { ascending: true, nullsFirst: false })
      .order("order_index", { ascending: true })

    if (!substeps || substeps.length === 0) {
      return NextResponse.json({ tasks: [], availableHours: dailyWorkHours })
    }

    // 4. Enrichir les substeps avec les infos du projet
    const enrichedSubsteps: ProjectSubstep[] = substeps.map((substep: any) => {
      const project = projects.find((p) => p.id === substep.project_id)
      return {
        ...substep,
        project_title: project?.title || "Projet",
        project_category: project?.category || "Général",
        project_priority: project?.priority || 50,
        project_due_date: project?.due_date || null,
      }
    })

    // 5. Algorithme de planification intelligente
    const dailyPlan = generateDailyPlan(
      enrichedSubsteps,
      workHoursStart,
      workHoursEnd,
      dailyWorkHours,
      today
    )

    return NextResponse.json({
      tasks: dailyPlan,
      availableHours: dailyWorkHours,
      workHoursStart,
      workHoursEnd,
    })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

function generateDailyPlan(
  substeps: any[],
  workHoursStart: string,
  workHoursEnd: string,
  dailyWorkHours: number,
  today: string
): DailyPlanTask[] {
  // 1. Calculer un score de priorité pour chaque substep
  const scoredSubsteps = substeps.map((substep) => {
    let score = 0

    // Bonus si la substep est prévue pour aujourd'hui
    if (substep.scheduled_date === today) {
      score += 100
    }

    // Bonus si la substep est en retard
    if (substep.scheduled_date && substep.scheduled_date < today) {
      score += 50
    }

    // Bonus basé sur la priorité du projet
    score += (substep.project_priority || 50) / 10

    // Bonus si la substep est déjà en cours
    if (substep.status === "in_progress") {
      score += 30
    }

    // Bonus si le projet a une date d'échéance proche
    if (substep.project_due_date) {
      const daysUntilDue = Math.ceil(
        (new Date(substep.project_due_date).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      if (daysUntilDue <= 7 && daysUntilDue > 0) {
        score += 20
      } else if (daysUntilDue <= 0) {
        score += 80 // En retard
      }
    }

    // Bonus basé sur l'ordre dans le step
    score -= substep.order_index * 2

    return { ...substep, priority_score: score }
  })

  // 2. Trier par score de priorité
  scoredSubsteps.sort((a, b) => b.priority_score - a.priority_score)

  // 3. Répartir les tâches dans la journée
  const startHour = parseInt(workHoursStart.split(":")[0])
  const endHour = parseInt(workHoursEnd.split(":")[0])
  const availableMinutes = dailyWorkHours * 60

  let currentMinutes = 0
  let currentHour = startHour
  let currentMinute = 0

  const dailyPlan: DailyPlanTask[] = []

  for (const substep of scoredSubsteps) {
    // Estimer la durée en minutes (parser estimated_duration)
    const durationInMinutes = parseDuration(substep.estimated_duration)

    // Vérifier si on a assez de temps dans la journée
    if (currentMinutes + durationInMinutes > availableMinutes) {
      break // Journée pleine
    }

    // Vérifier qu'on ne dépasse pas l'heure de fin
    const taskEndHour = currentHour + Math.floor((currentMinute + durationInMinutes) / 60)
    if (taskEndHour >= endHour) {
      break
    }

    // Créer la tâche planifiée
    const scheduledTime = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`

    dailyPlan.push({
      id: substep.id,
      title: substep.title,
      description: substep.description,
      estimatedDuration: substep.estimated_duration,
      scheduledTime,
      projectTitle: substep.project_title,
      projectCategory: substep.project_category,
      substepId: substep.id,
      stepId: substep.step_id,
      projectId: substep.project_id,
      priority: substep.priority_score,
    })

    // Avancer le temps
    currentMinutes += durationInMinutes
    currentMinute += durationInMinutes
    while (currentMinute >= 60) {
      currentHour += 1
      currentMinute -= 60
    }

    // Ajouter une pause de 5 minutes entre les tâches
    currentMinute += 5
    if (currentMinute >= 60) {
      currentHour += 1
      currentMinute -= 60
    }
  }

  return dailyPlan
}

function parseDuration(duration: string): number {
  if (!duration) return 30 // Durée par défaut

  const lower = duration.toLowerCase()

  // Matcher différents formats: "2h", "30min", "1h30", "90 minutes", etc.
  const hoursMatch = lower.match(/(\d+)\s*h/)
  const minutesMatch = lower.match(/(\d+)\s*(min|m\b)/)

  let totalMinutes = 0

  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1]) * 60
  }

  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1])
  }

  // Si aucun format reconnu, essayer de parser comme nombre de minutes
  if (totalMinutes === 0) {
    const numberMatch = lower.match(/(\d+)/)
    if (numberMatch) {
      totalMinutes = parseInt(numberMatch[1])
    }
  }

  return totalMinutes || 30 // Par défaut 30 minutes
}
