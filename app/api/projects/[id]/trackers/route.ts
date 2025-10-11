import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// GET /api/projects/[id]/trackers - Récupérer les trackers d'un projet
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClientFromRequest(request)

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: projectId } = await params

    console.log("📊 Récupération des trackers pour projet:", projectId)

    // Récupérer les substeps avec tracking activé pour ce projet
    const { data: trackers, error: trackersError } = await supabase
      .from("project_substeps")
      .select("*")
      .eq("project_id", projectId)
      .eq("tracking_enabled", true)
      .order("order_index", { ascending: true })

    if (trackersError) {
      console.error("❌ Erreur récupération trackers:", trackersError)
      return NextResponse.json(
        { error: "Erreur lors de la récupération des trackers", details: trackersError.message },
        { status: 500 }
      )
    }

    console.log("✅ Trackers récupérés:", trackers?.length || 0)

    // Transformer les substeps en format compatible avec l'interface Tracker
    const formattedTrackers = (trackers || []).map((substep) => ({
      id: substep.id,
      user_id: user.id,
      project_id: substep.project_id,
      title: substep.title,
      description: substep.description || "",
      category: "", // À récupérer du projet si nécessaire
      icon: substep.icon,
      color: substep.color,
      frequency: substep.recurrence_type,
      frequency_value: substep.recurrence_value,
      target_days: substep.recurrence_days,
      start_date: substep.recurrence_start_date,
      end_date: substep.recurrence_end_date,
      total_completions: substep.total_completions,
      current_streak: substep.current_streak,
      best_streak: substep.best_streak,
      created_at: substep.created_at,
      updated_at: substep.updated_at,
      is_active: substep.status !== "skipped",
    }))

    return NextResponse.json({ trackers: formattedTrackers })
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des trackers du projet:", error)
    return NextResponse.json(
      { error: "Erreur serveur", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
