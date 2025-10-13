import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"
import { getUserContext, formatUserContextForAI, getUserRecommendations } from "@/lib/user-context"

interface PlanningConfig {
  intensity: 'light' | 'moderate' | 'intense'
  style: 'mixed' | 'thematic_blocks'
  selectedActivities: string[] // IDs des activités custom à inclure
  currentTime: string // Heure actuelle pour éviter le passé
  forceRegenerate?: boolean // Forcer la régénération même si un plan existe
  date?: string // Date du planning (format YYYY-MM-DD)
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
    const supabase = await createClientFromRequest(request)

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
      forceRegenerate = false,
      date
    } = body

    const today = date || new Date().toISOString().split("T")[0]
    const now = currentTime || new Date().toTimeString().split(' ')[0].substring(0, 5)

    console.log(`📅 Génération planning pour: ${today}`)

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
    const userCity = userProfile?.location || "Paris"
    const wakeUpTime = userProfile?.wake_up_time || "07:00:00"
    const sleepTime = userProfile?.sleep_time || "23:00:00"
    const morningRoutine = userProfile?.morning_routine
    const morningRoutineDuration = userProfile?.morning_routine_duration || 0
    const nightRoutine = userProfile?.night_routine
    const nightRoutineDuration = userProfile?.night_routine_duration || 0
    const preferredWorkDays = userProfile?.preferred_work_days || [1, 2, 3, 4, 5]

    // 2. Récupérer les projets actifs
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, title, category, deadline, status")
      .eq("user_id", user?.id || null)
      .eq("status", "active")
      .order("deadline", { ascending: true, nullsFirst: false })

    if (projectsError) {
      console.error("❌ Erreur requête projets:", projectsError)
    }

    console.log(`📊 Projets trouvés: ${projects?.length || 0}`)
    if (projects && projects.length > 0) {
      console.log(`   Projets:`, projects.map(p => `${p.title} (${p.status})`).join(', '))
    } else {
      console.log(`   User ID: ${user?.id || 'null'}`)

      // Vérifier tous les projets de l'utilisateur
      const { data: allProjects } = await supabase
        .from("projects")
        .select("id, title, status")
        .eq("user_id", user?.id || null)

      console.log(`   Tous les projets de l'utilisateur: ${allProjects?.length || 0}`)
      if (allProjects && allProjects.length > 0) {
        console.log(`   Statuts:`, allProjects.map(p => `${p.title}: ${p.status}`).join(', '))
      }
    }

    // Permettre la génération même sans projets si on a des activités personnalisées
    if ((!projects || projects.length === 0) && selectedActivities.length === 0) {
      console.log("⚠️ Aucun projet ni activité personnalisée sélectionnée")
      return NextResponse.json({
        tasks: [],
        availableHours: dailyWorkHours,
        message: "Aucun projet actif ou activité sélectionnée"
      })
    }

    // 3. Récupérer les substeps ET les trackers
    const projectIds = projects?.map((p) => p.id) || []
    let substeps: any[] = []

    if (projectIds.length > 0) {
      const { data: fetchedSubsteps } = await supabase
        .from("project_substeps")
        .select("*")
        .in("project_id", projectIds)
        .in("status", ["pending", "in_progress"])
        .order("scheduled_date", { ascending: true, nullsFirst: false })
        .order("order_index", { ascending: true })

      substeps = fetchedSubsteps || []
    }

    console.log(`📝 Substeps trouvées: ${substeps.length}`)

    // 4. Récupérer les activités personnalisées sélectionnées
    let customActivities: any[] = []
    if (selectedActivities.length > 0) {
      const { data: activities } = await supabase
        .from("custom_activities")
        .select("*")
        .in("id", selectedActivities)
      customActivities = activities || []
    }

    console.log(`🎨 Activités personnalisées sélectionnées: ${customActivities.length}`)

    // 4bis. Récupérer les créneaux horaires bloqués pour aujourd'hui
    const todayDayOfWeek = new Date(today).getDay()
    const { data: blockedSlots } = await supabase
      .from("blocked_time_slots")
      .select("*")
      .eq("user_id", user?.id || null)
      .contains("days_of_week", [todayDayOfWeek])

    // 5. Enrichir les substeps
    const enrichedSubsteps: EnrichedSubstep[] = substeps.map((substep: any) => {
      const project = projects?.find((p) => p.id === substep.project_id)
      return {
        ...substep,
        project_title: project?.title || "Projet",
        project_category: project?.category || "Général",
        project_due_date: project?.deadline || null,
        project_priority: calculateProjectPriority(project, today),
      }
    })

    console.log(`✅ Planning - ${enrichedSubsteps.length} substeps + ${customActivities.length} activités personnalisées`)

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
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      blockedSlots: blockedSlots || [],
      wakeUpTime,
      sleepTime,
      morningRoutine,
      morningRoutineDuration,
      nightRoutine,
      nightRoutineDuration,
      preferredWorkDays,
      todayDayOfWeek
    })

    console.log(`🎯 Planning généré: ${dailyPlan.length} tâches au total`)

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
    const supabase = await createClientFromRequest(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Récupérer le paramètre de date depuis l'URL
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const today = dateParam || new Date().toISOString().split("T")[0]

    console.log(`📅 Récupération planning pour: ${today}`)

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
  blockedSlots?: any[]
  wakeUpTime?: string
  sleepTime?: string
  morningRoutine?: string
  morningRoutineDuration?: number
  nightRoutine?: string
  nightRoutineDuration?: number
  preferredWorkDays?: number[]
  todayDayOfWeek?: number
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
    anthropicApiKey,
    blockedSlots = [],
    wakeUpTime,
    sleepTime,
    morningRoutine,
    morningRoutineDuration = 0,
    nightRoutine,
    nightRoutineDuration = 0,
    preferredWorkDays = [1, 2, 3, 4, 5],
    todayDayOfWeek = new Date().getDay()
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

  // 2bis. Vérifier si un créneau horaire est bloqué
  function isTimeSlotBlocked(hour: number, minute: number, durationMinutes: number): boolean {
    const taskStart = hour * 60 + minute
    const taskEnd = taskStart + durationMinutes

    for (const slot of blockedSlots) {
      const [slotStartHour, slotStartMin] = slot.start_time.split(':').map(Number)
      const [slotEndHour, slotEndMin] = slot.end_time.split(':').map(Number)
      const slotStart = slotStartHour * 60 + slotStartMin
      const slotEnd = slotEndHour * 60 + slotEndMin

      // Vérifier si la tâche chevauche le créneau bloqué
      if ((taskStart >= slotStart && taskStart < slotEnd) ||
          (taskEnd > slotStart && taskEnd <= slotEnd) ||
          (taskStart <= slotStart && taskEnd >= slotEnd)) {
        return true
      }
    }
    return false
  }

  // 3. Déterminer l'heure de début et de fin disponibles
  const [startHour, startMinute] = now.split(':').map(Number)
  const [workStartHour] = workHoursStart.split(':').map(Number)
  const [workEndHour] = workHoursEnd.split(':').map(Number)
  const [wakeHour, wakeMinute] = (wakeUpTime || "07:00:00").split(':').map(Number)
  const [sleepHour] = (sleepTime || "23:00:00").split(':').map(Number)

  // Calculer l'heure de début en tenant compte de la routine matinale
  let morningEndHour = wakeHour
  let morningEndMinute = wakeMinute + morningRoutineDuration
  while (morningEndMinute >= 60) {
    morningEndHour += 1
    morningEndMinute -= 60
  }

  // L'heure de début est la plus tardive entre :
  // - Fin de routine matinale
  // - Heure actuelle (si on génère dans la journée)
  let currentHour = Math.max(startHour, morningEndHour)
  let currentMinute = startHour >= morningEndHour ? startMinute : morningEndMinute

  // Si on est actuellement dans les heures de travail salarié, commencer après
  if (currentHour < workEndHour && currentHour >= workStartHour) {
    currentHour = workEndHour
    currentMinute = 0
  }

  // L'heure de fin est la plus tôt entre :
  // - Heure de coucher
  // - Début de la routine du soir
  let endHour = sleepHour
  let endMinute = 0

  // Soustraire la durée de la routine du soir
  endMinute -= nightRoutineDuration
  while (endMinute < 0) {
    endHour -= 1
    endMinute += 60
  }

  console.log(`⏰ Plage horaire disponible: ${currentHour}:${String(currentMinute).padStart(2, '0')} - ${endHour}:${String(endMinute).padStart(2, '0')}`)
  console.log(`🚫 Heures de travail salarié: ${workStartHour}:00 - ${workEndHour}:00`)

  // 4. Planifier selon le style
  const dailyPlan: DailyPlanTask[] = []
  let currentMinutes = 0
  let lastBreakTime = 0
  let breakCounter = 0

  // Fonction pour vérifier si on est dans les heures de travail salarié
  function isInWorkHours(hour: number): boolean {
    return hour >= workStartHour && hour < workEndHour
  }

  if (style === 'thematic_blocks') {
    // Regrouper par catégorie de projet
    const byCategory = groupBy(scoredSubsteps, 'project_category')

    for (const [category, tasks] of Object.entries(byCategory)) {
      for (const substep of tasks as EnrichedSubstep[]) {
        if (currentHour >= endHour) break

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
          endHour,
          breakCounter,
          isTimeSlotBlocked,
          workStartHour,
          workEndHour
        })

        if (!result) break

        currentHour = result.currentHour
        currentMinute = result.currentMinute
        currentMinutes = result.currentMinutes
        lastBreakTime = result.lastBreakTime
        breakCounter = result.breakCounter
      }
    }
  } else {
    // Style mixte - alterner les catégories
    for (const substep of scoredSubsteps) {
      if (currentHour >= endHour) break

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
        endHour,
        breakCounter,
        isTimeSlotBlocked,
        workStartHour,
        workEndHour
      })

      if (!result) break

      currentHour = result.currentHour
      currentMinute = result.currentMinute
      currentMinutes = result.currentMinutes
      lastBreakTime = result.lastBreakTime
      breakCounter = result.breakCounter
    }
  }

  // 5. Insérer les activités personnalisées
  for (const activity of customActivities) {
    if (currentHour >= endHour) break

    const durationInMinutes = parseDuration(activity.estimated_duration)

    if (currentMinutes + durationInMinutes > availableMinutes) break

    const taskEndHour = currentHour + Math.floor((currentMinute + durationInMinutes) / 60)
    if (taskEndHour >= endHour) break

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
      addBreakToPlan(dailyPlan, currentHour, currentMinute, intensityConfig.breakDuration, breakCounter++)
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
      // Récupérer l'ID utilisateur depuis le contexte de génération
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const suggestion = await generateRelaxationSuggestion({
        anthropicApiKey,
        userCity,
        planSummary: dailyPlan.map(t => ({
          title: t.title,
          category: t.projectCategory,
          duration: t.estimatedDuration
        })),
        customActivities: customActivities.map(a => ({
          title: a.title,
          duration: a.estimated_duration,
          type: a.activity_type
        })),
        currentHour,
        currentMinute,
        supabase,
        userId: user?.id
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
  endHour: number
  breakCounter: number
  isTimeSlotBlocked: (hour: number, minute: number, duration: number) => boolean
  workStartHour: number
  workEndHour: number
}): { currentHour: number, currentMinute: number, currentMinutes: number, lastBreakTime: number, breakCounter: number } | null {
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
    endHour,
    breakCounter,
    isTimeSlotBlocked,
    workStartHour,
    workEndHour
  } = params

  const durationInMinutes = parseDuration(task.estimated_duration)

  if (currentMinutes + durationInMinutes > availableMinutes) return null

  const taskEndHour = currentHour + Math.floor((currentMinute + durationInMinutes) / 60)
  const taskEndMinute = (currentMinute + durationInMinutes) % 60

  if (taskEndHour > endHour || (taskEndHour === endHour && taskEndMinute > 0)) return null

  // Vérifier si le créneau chevauche les heures de travail salarié
  const isInWorkHours = (currentHour >= workStartHour && currentHour < workEndHour) ||
                        (taskEndHour > workStartHour && taskEndHour <= workEndHour)

  if (isInWorkHours) {
    // Sauter après les heures de travail
    let nextHour = workEndHour
    let nextMinute = 0

    // Si on dépasse la fin de la journée, abandonner
    if (nextHour >= endHour) return null

    // Ré-essayer après les heures de travail
    return addTaskToPlan({
      ...params,
      currentHour: nextHour,
      currentMinute: nextMinute
    })
  }

  // Vérifier si le créneau est bloqué (créneaux personnalisés)
  if (isTimeSlotBlocked(currentHour, currentMinute, durationInMinutes)) {
    // Essayer de trouver le prochain créneau disponible
    let nextHour = currentHour
    let nextMinute = currentMinute + 15 // Avancer par intervalles de 15 minutes

    while (nextMinute >= 60) {
      nextHour += 1
      nextMinute -= 60
    }

    // Si on dépasse la fin de la journée, abandonner
    if (nextHour >= endHour) return null

    // Ré-essayer avec le nouveau créneau
    return addTaskToPlan({
      ...params,
      currentHour: nextHour,
      currentMinute: nextMinute
    })
  }

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
  let newBreakCounter = breakCounter
  if (newCurrentMinutes - lastBreakTime >= breakFrequency) {
    addBreakToPlan(dailyPlan, newCurrentHour, newCurrentMinute, intensityConfig.breakDuration, newBreakCounter++)
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
    lastBreakTime: newLastBreakTime,
    breakCounter: newBreakCounter
  }
}

function addBreakToPlan(dailyPlan: DailyPlanTask[], hour: number, minute: number, duration: number, counter: number) {
  const scheduledTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`

  dailyPlan.push({
    id: `break-${counter}`,
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
  customActivities?: any[]
  currentHour: number
  currentMinute: number
  supabase: any
  userId?: string
}): Promise<DailyPlanTask | null> {
  const { anthropicApiKey, userCity, planSummary, customActivities, currentHour, currentMinute, supabase, userId } = params

  // Récupérer quelques lieux intéressants
  const { data: locations } = await supabase
    .from("activity_locations")
    .select("*")
    .eq("city", userCity)
    .limit(5)

  // Récupérer le contexte utilisateur
  let userContextText = ""
  if (userId) {
    const context = await getUserContext(supabase, userId)
    const formattedContext = formatUserContextForAI(context)
    const recommendations = getUserRecommendations(context)

    if (formattedContext) {
      userContextText = `\n📋 CONTEXTE UTILISATEUR :\n${formattedContext}${recommendations}\n\n⚡ IMPORTANT : Suggère une activité adaptée au profil, aux préférences et aux horaires de l'utilisateur.\n`
    }
  }

  const prompt = `Tu es un assistant de bien-être. Analyse ce planning de journée et suggère UNE activité relaxante adaptée.
${userContextText}
Planning actuel:
${planSummary.map(t => `- ${t.title} (${t.category}) - ${t.duration}`).join('\n')}

Activités personnalisées sélectionnées par l'utilisateur:
${customActivities && customActivities.length > 0
  ? customActivities.map(a => `- ${a.title} (${a.duration}, type: ${a.type})`).join('\n')
  : 'Aucune activité personnalisée sélectionnée'}

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

IMPORTANT: Tiens compte des activités personnalisées sélectionnées pour faire des suggestions cohérentes et complémentaires. L'activité doit être adaptée au moment de la journée et au type de travail déjà effectué.`

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
