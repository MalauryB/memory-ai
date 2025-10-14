import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// GET /api/trackers - Récupérer tous les trackers de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientFromRequest(request)

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Récupérer tous les substeps avec tracking_enabled = true
    const { data: trackingSubsteps, error } = await supabase
      .from("project_substeps")
      .select(`
        id,
        title,
        description,
        tracking_enabled,
        recurrence_type,
        recurrence_value,
        status,
        created_at,
        updated_at,
        project:projects!inner (
          id,
          title,
          category,
          user_id
        )
      `)
      .eq("tracking_enabled", true)
      .eq("projects.user_id", user?.id || null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erreur récupération trackers:", error)
      return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 })
    }

    // ⚡ OPTIMISATION : Récupérer TOUTES les complétions en UNE SEULE requête
    const today = new Date().toISOString().split("T")[0]
    const trackerIds = (trackingSubsteps || []).map((s: any) => s.id)

    let allCompletions: any[] = []
    let completionsToday: any[] = []

    if (trackerIds.length > 0) {
      // Récupérer toutes les complétions en parallèle
      const [allCompletionsResult, todayCompletionsResult] = await Promise.all([
        supabase
          .from("substep_completions")
          .select("substep_id, completion_date")
          .in("substep_id", trackerIds)
          .order("completion_date", { ascending: false }),
        supabase
          .from("substep_completions")
          .select("substep_id, completion_date")
          .in("substep_id", trackerIds)
          .eq("completion_date", today)
      ])

      allCompletions = allCompletionsResult.data || []
      completionsToday = todayCompletionsResult.data || []
    }

    // Grouper les complétions par tracker
    const completionsByTracker = new Map<string, string[]>()
    allCompletions.forEach((c: any) => {
      if (!completionsByTracker.has(c.substep_id)) {
        completionsByTracker.set(c.substep_id, [])
      }
      completionsByTracker.get(c.substep_id)!.push(c.completion_date)
    })

    // Créer un Set des trackers complétés aujourd'hui
    const completedTodayIds = new Set(completionsToday.map((c: any) => c.substep_id))

    // ⚡ OPTIMISATION : Calculs simplifiés des statistiques
    const trackersWithStats = (trackingSubsteps || []).map((substep: any) => {
      const completions = completionsByTracker.get(substep.id) || []
      const totalCompletions = completions.length

      // Calculer la série actuelle (simplifié)
      let currentStreak = 0
      if (completions.length > 0) {
        const sortedDates = [...completions].sort().reverse()
        let checkDate = new Date()

        for (const dateStr of sortedDates) {
          const completionDate = new Date(dateStr)
          const daysDiff = Math.floor((checkDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysDiff <= 1) {
            currentStreak++
            checkDate = completionDate
          } else {
            break
          }
        }
      }

      return {
        id: substep.id,
        user_id: user.id,
        title: substep.title,
        description: substep.description || "",
        category: substep.project?.category || "Général",
        project_title: substep.project?.title || "",
        project_id: substep.project?.id || "",
        frequency: substep.recurrence_type || "daily",
        frequency_value: substep.recurrence_value || 1,
        start_date: substep.created_at?.split("T")[0] || today,
        end_date: null,
        total_completions: totalCompletions,
        current_streak: currentStreak,
        best_streak: currentStreak, // Simplifié
        created_at: substep.created_at,
        updated_at: substep.updated_at,
        is_active: substep.status !== "completed",
        completed_today: completedTodayIds.has(substep.id)
      }
    })

    return NextResponse.json({
      trackers: trackersWithStats,
      completedToday: Array.from(completedTodayIds)
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des trackers:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/trackers - Créer un nouveau tracker
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientFromRequest(request)

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()

    // TODO: Valider les données et insérer dans la base de données

    return NextResponse.json({ success: true, tracker: { id: "new-id", ...body } })
  } catch (error) {
    console.error("Erreur lors de la création du tracker:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
