import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// POST /api/trackers/complete - Marquer un tracker comme complété
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { tracker_id, completion_date, notes } = body

    if (!tracker_id || !completion_date) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
    }

    // 1. Vérifier que le substep (tracker) appartient à l'utilisateur
    const { data: substep } = await supabase
      .from("project_substeps")
      .select(`
        id,
        tracking_enabled,
        project:projects!inner (
          user_id
        )
      `)
      .eq("id", tracker_id)
      .eq("projects.user_id", user?.id || null)
      .eq("tracking_enabled", true)
      .single()

    if (!substep) {
      return NextResponse.json({ error: "Tracker non trouvé ou non autorisé" }, { status: 403 })
    }

    // 2. Vérifier qu'il n'y a pas déjà une complétion pour cette date
    const { data: existingCompletion } = await supabase
      .from("substep_completions")
      .select("id")
      .eq("substep_id", tracker_id)
      .eq("completion_date", completion_date)
      .single()

    if (existingCompletion) {
      return NextResponse.json({ error: "Déjà complété pour cette date" }, { status: 409 })
    }

    // 3. Insérer la nouvelle complétion
    const { data: completion, error: insertError } = await supabase
      .from("substep_completions")
      .insert({
        substep_id: tracker_id,
        user_id: user?.id || null,
        completion_date,
        completed_at: new Date().toISOString(),
        notes: notes || null
      })
      .select()
      .single()

    if (insertError) {
      console.error("Erreur insertion complétion:", insertError)
      return NextResponse.json({ error: "Erreur lors de la complétion" }, { status: 500 })
    }

    // 4. Les statistiques seront recalculées lors de la prochaine récupération des trackers

    return NextResponse.json({
      success: true,
      completion: {
        id: completion.id,
        tracker_id: completion.substep_id,
        completion_date: completion.completion_date,
        completed_at: completion.completed_at,
        notes: completion.notes,
        created_at: completion.created_at
      }
    })
  } catch (error) {
    console.error("Erreur lors de la complétion du tracker:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
