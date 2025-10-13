import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// GET /api/trackers/completions - Récupérer les complétions pour une date
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

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    if (!date) {
      return NextResponse.json({ error: "Date requise" }, { status: 400 })
    }

    // Récupérer toutes les complétions pour cette date
    // On doit joindre avec project_substeps pour vérifier que le substep appartient à l'utilisateur
    const { data: completions, error } = await supabase
      .from("tracker_completions")
      .select(`
        id,
        substep_id,
        completion_date,
        completed_at,
        notes,
        created_at,
        project_substeps!inner (
          project:projects!inner (
            user_id
          )
        )
      `)
      .eq("completion_date", date)
      .eq("project_substeps.projects.user_id", user?.id || null)

    if (error) {
      console.error("Erreur récupération complétions:", error)
      return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 })
    }

    // Transformer les données pour correspondre au format attendu
    const formattedCompletions = (completions || []).map((c: any) => ({
      id: c.id,
      tracker_id: c.substep_id,
      completion_date: c.completion_date,
      completed_at: c.completed_at,
      notes: c.notes,
      created_at: c.created_at
    }))

    return NextResponse.json({ completions: formattedCompletions })
  } catch (error) {
    console.error("Erreur lors de la récupération des complétions:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
