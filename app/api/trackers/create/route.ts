import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// POST /api/trackers/create - Créer un tracker manuellement
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
    const { project_id, step_id, title, description, recurrence_type, recurrence_value, icon, color } = body

    console.log("📝 Création manuelle d'un tracker:", { project_id, title, recurrence_type })

    // Valider les données
    if (!project_id || !title || !recurrence_type) {
      return NextResponse.json({ error: "Données manquantes (project_id, title, recurrence_type requis)" }, { status: 400 })
    }

    // Vérifier que le projet appartient à l'utilisateur
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      console.error("❌ Projet non trouvé ou non autorisé:", projectError)
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 })
    }

    // Créer le tracker (substep avec tracking activé)
    const trackerData = {
      project_id,
      step_id: step_id || null,
      title,
      description: description || null,
      tracking_enabled: true,
      recurrence_type,
      recurrence_value: recurrence_value || 1,
      recurrence_start_date: new Date().toISOString().split("T")[0],
      status: "pending",
      order_index: 0,
      icon: icon || "target",
      color: color || "#6366f1",
    }

    const { data: createdTracker, error: createError } = await supabase
      .from("project_substeps")
      .insert(trackerData)
      .select()
      .single()

    if (createError) {
      console.error("❌ Erreur création tracker:", createError)
      return NextResponse.json(
        { error: "Erreur lors de la création du tracker", details: createError.message },
        { status: 500 }
      )
    }

    console.log("✅ Tracker créé manuellement:", createdTracker.id)

    return NextResponse.json({
      success: true,
      tracker: createdTracker,
      message: "Tracker créé avec succès",
    })
  } catch (error) {
    console.error("❌ Erreur lors de la création du tracker:", error)
    return NextResponse.json(
      { error: "Erreur serveur", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
