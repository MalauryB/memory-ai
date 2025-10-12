import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

interface PlanningConfig {
  intensity: 'light' | 'moderate' | 'intense'
  style: 'mixed' | 'thematic_blocks'
  selectedActivities: string[] // IDs des activités custom à inclure
  currentTime: string // Heure actuelle pour éviter le passé
  forceRegenerate?: boolean // Forcer la régénération même si un plan existe
}

interface EnrichedSubstep {
  id: string
  title: string
  description: string
  estimated_duration: string
  status: string
  tracking_enabled: boolean
  project_id: string
  project_title: string
  project_category: string
  step_id: string
  scheduled_date: string | null
  order_index: number
  project_priority: number
  project_due_date: string | null
  priority_score?: number
}

interface DailyPlanTask {
  id: string
  title: string
  description: string
  estimatedDuration: string
  scheduledTime: string
  projectTitle?: string
  projectCategory?: string
  substepId?: string
  stepId?: string
  projectId?: string
  priority: number
  itemType: 'substep' | 'tracker' | 'custom_activity' | 'break' | 'suggested_activity'
  canBeCombined?: boolean
  combinedWithId?: string
  location?: {
    name: string
    address: string
    type: string
  }
  isSuggested?: boolean
}

// POST - Générer et sauvegarder un planning avec configuration personnalisée
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body: PlanningConfig = await request.json()
    const {
      intensity = 'moderate',
      style = 'mixed',
      selectedActivities = [],
      currentTime,
      forceRegenerate = false
    } = body

    const today = new Date().toISOString().split("T")[0]
    const now = currentTime || new Date().toTimeString().split(' ')[0].substring(0, 5)

    // Vérifier si un plan existe déjà pour aujourd'hui
    if (!forceRegenerate) {
      const { data: existingPlan } = await supabase
        .from("daily_plans")
        .select("*, daily_plan_items(*)")
        .eq("user_id", user?.id || null)
        .eq("plan_date", today)
        .single()

      // Si un plan existe déjà, le retourner
      if (existingPlan && existingPlan.daily_plan_items?.length > 0) {
        const tasks = existingPlan.daily_plan_items.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          estimatedDuration: item.substep_id ? null : "30min",
          scheduledTime: item.scheduled_time?.substring(0, 5) || "09:00",
          projectTitle: item.project_title,
          projectCategory: item.project_category,
          substepId: item.substep_id,
          priority: 50,
          itemType: item.item_type || 'substep',
          completed: item.completed,
          isSuggested: item.is_suggested
        }))

        return NextResponse.json({
          tasks,
          availableHours: existingPlan.available_hours,
          fromCache: true
        })
      }
    }

    // 1. Récupérer le profil utilisateur
    let userProfile: any = null
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single()
      userProfile = profile
    }

    const workHoursStart = userProfile?.work_hours_start || "09:00:00"
    const workHoursEnd = userProfile?.work_hours_end || "18:00:00"
    const dailyWorkHours = userProfile?.daily_work_hours || 8
    const breakFrequency = userProfile?.break_frequency || 60
    const userCity = userProfile?.location_city || "Paris"

    // 2. Récupérer les projets actifs
    const { data: projects } = await supabase
      .from("projects")
      .select("id, title, category, deadline")
      .eq("user_id", user?.id || null)
      .in("status", ["active"])
      .order("deadline", { ascending: true, nullsFirst: false })

    if (!projects || projects.length === 0) {
      return NextResponse.json({ tasks: [], availableHours: dailyWorkHours })
    }

    // 3. Récupérer les substeps ET les trackers
    const projectIds = projects.map((p) => p.id)
    const { data: substeps } = await supabase
      .from("project_substeps")
      .select("*")
      .in("project_id", projectIds)
      .in("status", ["pending", "in_progress"])
      .order("scheduled_date", { ascending: true, nullsFirst: false })
      .order("order_index", { ascending: true })

    // 4. Récupérer les activités personnalisées sélectionnées
    let customActivities: any[] = []
    if (selectedActivities.length > 0) {
      const { data: activities } = await supabase
        .from("custom_activities")
        .select("*")
        .in("id", selectedActivities)
      customActivities = activities || []
    }

    // 5. Enrichir les substeps
    const enrichedSubsteps: EnrichedSubstep[] = (substeps || []).map((substep: any) => {
      const project = projects.find((p) => p.id === substep.project_id)
      return {
        ...substep,
        project_title: project?.title || "Projet",
        project_category: project?.category || "Général",
        project_due_date: project?.deadline || null,
        project_priority: calculateProjectPriority(project, today),
      }
    })

    // 6. Générer le planning intelligent
    const dailyPlan = await generateIntelligentDailyPlan({
      substeps: enrichedSubsteps,
      customActivities,
      workHoursStart,
      workHoursEnd,
      now,
      dailyWorkHours,
      breakFrequency,
      intensity,
      style,
      today,
      userCity,
      supabase,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY
    })

    // 7. Sauvegarder le plan en base de données
    if (user && dailyPlan.length > 0) {
      // Créer ou mettre à jour le daily_plan
      const { data: savedPlan, error: planError } = await supabase
        .from("daily_plans")
        .upsert({
          user_id: user.id,
          plan_date: today,
          total_tasks: dailyPlan.length,
          completed_tasks: 0,
          available_hours: dailyWorkHours
        }, {
          onConflict: 'user_id,plan_date'
        })
        .select()
        .single()

      if (planError) {
        console.error("Erreur création plan:", planError)
      } else if (savedPlan) {
        // Supprimer les anciens items du plan
        await supabase
          .from("daily_plan_items")
          .delete()
          .eq("daily_plan_id", savedPlan.id)

        // Insérer les nouveaux items
        const itemsToInsert = dailyPlan.map((task, index) => ({
          daily_plan_id: savedPlan.id,
          substep_id: task.substepId || null,
          custom_activity_id: task.itemType === 'custom_activity' ? task.id : null,
          title: task.title,
          description: task.description,
          scheduled_time: task.scheduledTime,
          order_index: index,
          completed: false,
          item_type: task.itemType,
          is_suggested: task.isSuggested || false,
          is_break: task.itemType === 'break'
        }))

        const { error: itemsError } = await supabase
          .from("daily_plan_items")
          .insert(itemsToInsert)

        if (itemsError) {
          console.error("Erreur insertion items:", itemsError)
        }
      }
    }

    return NextResponse.json({
      tasks: dailyPlan,
      availableHours: dailyWorkHours,
      workHoursStart,
      workHoursEnd,
      config: {
        intensity,
        style
      },
      saved: true
    })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// GET - Récupérer le planning du jour sauvegardé
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const today = new Date().toISOString().split("T")[0]

    // Récupérer le plan du jour avec ses items et les enrichir avec les infos des substeps
    const { data: dailyPlan } = await supabase
      .from("daily_plans")
      .select(`
        *,
        daily_plan_items (
          *,
          project_substeps (
            project_id,
            project:projects (
              title,
              category
            )
          )
        )
      `)
      .eq("user_id", user?.id || null)
      .eq("plan_date", today)
      .single()

    if (!dailyPlan || !dailyPlan.daily_plan_items || dailyPlan.daily_plan_items.length === 0) {
      return NextResponse.json({
        tasks: [],
        availableHours: 8,
        needsGeneration: true
      })
    }

    // Transformer les items en format DailyTask
    const tasks = dailyPlan.daily_plan_items
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((item: any) => {
        const substep = item.project_substeps
        const project = substep?.project

        return {
          id: item.id,
          title: item.title,
          description: item.description || "",
          estimatedDuration: item.substep_id ? substep?.estimated_duration || "30min" : "30min",
          scheduledTime: item.scheduled_time?.substring(0, 5) || "09:00",
          projectTitle: project?.title,
          projectCategory: project?.category,
          substepId: item.substep_id,
          priority: 50,
          itemType: item.item_type || 'substep',
          completed: item.completed,
          isSuggested: item.is_suggested,
          canBeCombined: item.can_be_combined
        }
      })

    return NextResponse.json({
      tasks,
      availableHours: dailyPlan.available_hours,
      fromCache: true
    })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

function calculateProjectPriority(project: any, today: string): number {
  if (!project?.deadline) return 50

  const daysUntilDue = Math.ceil(
    (new Date(project.deadline).getTime() - new Date(today).getTime()) /
      (1000 * 60 * 60 * 24)
  )

  if (daysUntilDue < 0) return 100 // En retard
  if (daysUntilDue <= 3) return 90
  if (daysUntilDue <= 7) return 75
  if (daysUntilDue <= 14) return 60
  return 50
}

async function generateIntelligentDailyPlan(config: {
  substeps: EnrichedSubstep[]
  customActivities: any[]
  workHoursStart: string
  workHoursEnd: string
  now: string
  dailyWorkHours: number
  breakFrequency: number
  intensity: string
  style: string
  today: string
  userCity: string
  supabase: any
  anthropicApiKey?: string
}): Promise<DailyPlanTask[]> {
  const {
    substeps,
    customActivities,
    workHoursStart,
    workHoursEnd,
    now,
    dailyWorkHours,
    breakFrequency,
    intensity,
    style,
    today,
    userCity,
    supabase,
    anthropicApiKey
  } = config

  // 1. Calculer les paramètres d'intensité
  const intensityConfig = {
    light: { workRatio: 0.6, breakDuration: 15, betweenTasksBreak: 10 },
    moderate: { workRatio: 0.75, breakDuration: 10, betweenTasksBreak: 5 },
    intense: { workRatio: 0.9, breakDuration: 5, betweenTasksBreak: 3 }
  }[intensity] || intensityConfig.moderate

  const availableMinutes = dailyWorkHours * 60 * intensityConfig.workRatio

  // 2. Scorer et trier les substeps
  const scoredSubsteps = substeps.map((substep) => {
    let score = 0

    // Bonus si prévue pour aujourd'hui
    if (substep.scheduled_date === today) score += 100

    // Bonus si en retard
    if (substep.scheduled_date && substep.scheduled_date < today) score += 50

    // Bonus priorité projet
    score += substep.project_priority

    // Bonus si en cours
    if (substep.status === "in_progress") score += 30

    // Bonus pour les trackers (habitudes quotidiennes)
    if (substep.tracking_enabled) score += 40

    // Malus selon l'ordre
    score -= substep.order_index * 2

    return { ...substep, priority_score: score }
  })

  scoredSubsteps.sort((a, b) => b.priority_score - a.priority_score)

  // 3. Déterminer l'heure de début (maintenant ou work_hours_start)
  const [startHour, startMinute] = now.split(':').map(Number)
  const [workStartHour] = workHoursStart.split(':').map(Number)
  const [workEndHour] = workHoursEnd.split(':').map(Number)

  let currentHour = Math.max(startHour, workStartHour)
  let currentMinute = startHour >= workStartHour ? startMinute : 0

  // 4. Planifier selon le style
  const dailyPlan: DailyPlanTask[] = []
  let currentMinutes = 0
  let lastBreakTime = 0

  if (style === 'thematic_blocks') {
    // Regrouper par catégorie de projet
    const byCategory = groupBy(scoredSubsteps, 'project_category')

    for (const [category, tasks] of Object.entries(byCategory)) {
      for (const substep of tasks as EnrichedSubstep[]) {
        if (currentHour >= workEndHour) break

        const result = addTaskToPlan({
          task: substep,
          dailyPlan,
          currentHour,
          currentMinute,
          currentMinutes,
          lastBreakTime,
          availableMinutes,
          breakFrequency,
          intensityConfig,
          workEndHour
        })

        if (!result) break

        currentHour = result.currentHour
        currentMinute = result.currentMinute
        currentMinutes = result.currentMinutes
        lastBreakTime = result.lastBreakTime
      }
    }
  } else {
    // Style mixte - alterner les catégories
    for (const substep of scoredSubsteps) {
      if (currentHour >= workEndHour) break

      const result = addTaskToPlan({
        task: substep,
        dailyPlan,
        currentHour,
        currentMinute,
        currentMinutes,
        lastBreakTime,
        availableMinutes,
        breakFrequency,
        intensityConfig,
        workEndHour
      })

      if (!result) break

      currentHour = result.currentHour
      currentMinute = result.currentMinute
      currentMinutes = result.currentMinutes
      lastBreakTime = result.lastBreakTime
    }
  }

  // 5. Insérer les activités personnalisées
  for (const activity of customActivities) {
    if (currentHour >= workEndHour) break

    const durationInMinutes = parseDuration(activity.estimated_duration)

    if (currentMinutes + durationInMinutes > availableMinutes) break

    const taskEndHour = currentHour + Math.floor((currentMinute + durationInMinutes) / 60)
    if (taskEndHour >= workEndHour) break

    const scheduledTime = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`

    dailyPlan.push({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      estimatedDuration: activity.estimated_duration,
      scheduledTime,
      priority: 30,
      itemType: 'custom_activity',
      canBeCombined: activity.can_combine_with?.length > 0
    })

    currentMinutes += durationInMinutes
    currentMinute += durationInMinutes
    while (currentMinute >= 60) {
      currentHour += 1
      currentMinute -= 60
    }

    // Pause si nécessaire
    if (currentMinutes - lastBreakTime >= breakFrequency) {
      addBreakToPlan(dailyPlan, currentHour, currentMinute, intensityConfig.breakDuration)
      currentMinute += intensityConfig.breakDuration
      if (currentMinute >= 60) {
        currentHour += 1
        currentMinute -= 60
      }
      lastBreakTime = currentMinutes
    }
  }

  // 6. Suggérer une activité relaxante via IA (si API key disponible)
  if (anthropicApiKey && dailyPlan.length > 3) {
    try {
      const suggestion = await generateRelaxationSuggestion({
        anthropicApiKey,
        userCity,
        planSummary: dailyPlan.map(t => ({
          title: t.title,
          category: t.projectCategory,
          duration: t.estimatedDuration
        })),
        currentHour,
        currentMinute,
        supabase
      })

      if (suggestion) {
        dailyPlan.push(suggestion)
      }
    } catch (error) {
      console.error("Erreur suggestion IA:", error)
    }
  }

  return dailyPlan
}

function addTaskToPlan(params: {
  task: EnrichedSubstep
  dailyPlan: DailyPlanTask[]
  currentHour: number
  currentMinute: number
  currentMinutes: number
  lastBreakTime: number
  availableMinutes: number
  breakFrequency: number
  intensityConfig: any
  workEndHour: number
}): { currentHour: number, currentMinute: number, currentMinutes: number, lastBreakTime: number } | null {
  const {
    task,
    dailyPlan,
    currentHour,
    currentMinute,
    currentMinutes,
    lastBreakTime,
    availableMinutes,
    breakFrequency,
    intensityConfig,
    workEndHour
  } = params

  const durationInMinutes = parseDuration(task.estimated_duration)

  if (currentMinutes + durationInMinutes > availableMinutes) return null

  const taskEndHour = currentHour + Math.floor((currentMinute + durationInMinutes) / 60)
  if (taskEndHour >= workEndHour) return null

  const scheduledTime = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`

  dailyPlan.push({
    id: task.id,
    title: task.title,
    description: task.description,
    estimatedDuration: task.estimated_duration,
    scheduledTime,
    projectTitle: task.project_title,
    projectCategory: task.project_category,
    substepId: task.id,
    stepId: task.step_id,
    projectId: task.project_id,
    priority: task.priority_score || 50,
    itemType: task.tracking_enabled ? 'tracker' : 'substep'
  })

  let newCurrentMinutes = currentMinutes + durationInMinutes
  let newCurrentMinute = currentMinute + durationInMinutes
  let newCurrentHour = currentHour

  while (newCurrentMinute >= 60) {
    newCurrentHour += 1
    newCurrentMinute -= 60
  }

  // Ajouter une pause entre les tâches
  newCurrentMinute += intensityConfig.betweenTasksBreak
  if (newCurrentMinute >= 60) {
    newCurrentHour += 1
    newCurrentMinute -= 60
  }

  // Pause longue si nécessaire
  let newLastBreakTime = lastBreakTime
  if (newCurrentMinutes - lastBreakTime >= breakFrequency) {
    addBreakToPlan(dailyPlan, newCurrentHour, newCurrentMinute, intensityConfig.breakDuration)
    newCurrentMinute += intensityConfig.breakDuration
    if (newCurrentMinute >= 60) {
      newCurrentHour += 1
      newCurrentMinute -= 60
    }
    newLastBreakTime = newCurrentMinutes
  }

  return {
    currentHour: newCurrentHour,
    currentMinute: newCurrentMinute,
    currentMinutes: newCurrentMinutes,
    lastBreakTime: newLastBreakTime
  }
}

function addBreakToPlan(dailyPlan: DailyPlanTask[], hour: number, minute: number, duration: number) {
  const scheduledTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`

  dailyPlan.push({
    id: `break-${Date.now()}`,
    title: "Pause",
    description: "Moment de repos",
    estimatedDuration: `${duration}min`,
    scheduledTime,
    priority: 0,
    itemType: 'break'
  })
}

async function generateRelaxationSuggestion(params: {
  anthropicApiKey: string
  userCity: string
  planSummary: any[]
  currentHour: number
  currentMinute: number
  supabase: any
}): Promise<DailyPlanTask | null> {
  const { anthropicApiKey, userCity, planSummary, currentHour, currentMinute, supabase } = params

  // Récupérer quelques lieux intéressants
  const { data: locations } = await supabase
    .from("activity_locations")
    .select("*")
    .eq("city", userCity)
    .limit(5)

  const prompt = `Tu es un assistant de bien-être. Analyse ce planning de journée et suggère UNE activité relaxante adaptée.

Planning actuel:
${planSummary.map(t => `- ${t.title} (${t.category}) - ${t.duration}`).join('\n')}

Heure actuelle: ${currentHour}:${String(currentMinute).padStart(2, '0')}
Ville: ${userCity}

Lieux disponibles:
${locations?.map(l => `- ${l.name} (${l.location_type}): ${l.description}`).join('\n') || 'Aucun lieu disponible'}

Réponds UNIQUEMENT avec un JSON valide (pas de markdown):
{
  "title": "Titre court et engageant",
  "description": "Description de l'activité et pourquoi c'est bien pour se détendre maintenant",
  "duration": "30min",
  "location": "Nom du lieu si applicable, ou null"
}

L'activité doit être cohérente avec le moment de la journée et le type de travail déjà effectué.`

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const suggestion = JSON.parse(data.content[0].text)

    const scheduledTime = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`

    const location = locations?.find(l => l.name === suggestion.location)

    return {
      id: `suggestion-${Date.now()}`,
      title: `💡 ${suggestion.title}`,
      description: suggestion.description,
      estimatedDuration: suggestion.duration,
      scheduledTime,
      priority: 20,
      itemType: 'suggested_activity',
      isSuggested: true,
      location: location ? {
        name: location.name,
        address: location.address,
        type: location.location_type
      } : undefined
    }
  } catch (error) {
    console.error("Erreur génération suggestion:", error)
    return null
  }
}

function parseDuration(duration: string): number {
  if (!duration) return 30

  const lower = duration.toLowerCase()
  const hoursMatch = lower.match(/(\d+)\s*h/)
  const minutesMatch = lower.match(/(\d+)\s*(min|m\b)/)

  let totalMinutes = 0

  if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60
  if (minutesMatch) totalMinutes += parseInt(minutesMatch[1])

  if (totalMinutes === 0) {
    const numberMatch = lower.match(/(\d+)/)
    if (numberMatch) totalMinutes = parseInt(numberMatch[1])
  }

  return totalMinutes || 30
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const group = String(item[key])
    if (!result[group]) result[group] = []
    result[group].push(item)
    return result
  }, {} as Record<string, T[]>)
}
