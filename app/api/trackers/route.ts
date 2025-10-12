import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// GET /api/trackers - Récupérer tous les trackers de l'utilisateur
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

    // Calculer les statistiques pour chaque tracker
    const today = new Date().toISOString().split("T")[0]

    const trackersWithStats = await Promise.all(
      (trackingSubsteps || []).map(async (substep: any) => {
        // Récupérer les complétions pour ce tracker
        const { data: completions } = await supabase
          .from("tracker_completions")
          .select("completion_date")
          .eq("substep_id", substep.id)
          .order("completion_date", { ascending: false })

        const totalCompletions = completions?.length || 0

        // Calculer la série actuelle
        let currentStreak = 0
        if (completions && completions.length > 0) {
          const sortedDates = completions.map(c => c.completion_date).sort().reverse()
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

        // Calculer la meilleure série (approximation simple)
        const bestStreak = currentStreak // Pour l'instant, on garde la série actuelle

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
          best_streak: bestStreak,
          created_at: substep.created_at,
          updated_at: substep.updated_at,
          is_active: substep.status !== "completed"
        }
      })
    )

    return NextResponse.json({ trackers: trackersWithStats })
  } catch (error) {
    console.error("Erreur lors de la récupération des trackers:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/trackers - Créer un nouveau tracker
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)

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
