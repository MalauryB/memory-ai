import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// POST /api/projects/[id]/generate-trackers - Générer des trackers à partir d'un projet
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const body = await request.json()
    const { project_title, project_category } = body

    console.log("🚀 Génération de trackers pour projet:", projectId, project_title)

    // 1. Récupérer le projet et ses étapes
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        *,
        project_steps (
          id,
          title,
          description,
          order_index
        )
      `)
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      console.error("❌ Erreur récupération projet:", projectError)
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 })
    }

    console.log("✅ Projet récupéré:", project.title, "avec", project.project_steps?.length || 0, "étapes")

    // 2. Générer des substeps trackées basées sur les étapes du projet
    const substepsToCreate = []

    // Tracker général du projet (quotidien)
    substepsToCreate.push({
      project_id: projectId,
      step_id: project.project_steps?.[0]?.id || null,
      title: `Travail quotidien sur ${project.title}`,
      description: `Consacrer du temps à l'avancement de ${project.title}`,
      tracking_enabled: true,
      recurrence_type: "daily",
      recurrence_value: 1,
      recurrence_start_date: new Date().toISOString().split("T")[0],
      status: "pending",
      order_index: 0,
      icon: "target",
      color: "#6366f1"
    })

    // Si il y a des étapes, créer un tracker de révision
    if (project.project_steps && project.project_steps.length > 0) {
      substepsToCreate.push({
        project_id: projectId,
        step_id: project.project_steps[0].id,
        title: `Révision - ${project.title}`,
        description: `Revoir et consolider les acquis de ${project.title}`,
        tracking_enabled: true,
        recurrence_type: "every_x_days",
        recurrence_value: 2,
        recurrence_start_date: new Date().toISOString().split("T")[0],
        status: "pending",
        order_index: 1,
        icon: "refresh-cw",
        color: "#8b5cf6"
      })
    }

    console.log("📝 Substeps à créer:", substepsToCreate.length)

    // 3. Insérer les substeps trackées dans la base de données
    const { data: createdSubsteps, error: substepsError } = await supabase
      .from("project_substeps")
      .insert(substepsToCreate)
      .select()

    if (substepsError) {
      console.error("❌ Erreur création substeps:", substepsError)
      return NextResponse.json(
        { error: "Erreur lors de la création des trackers", details: substepsError.message },
        { status: 500 }
      )
    }

    console.log("✅ Trackers créés:", createdSubsteps?.length || 0)

    return NextResponse.json({
      success: true,
      trackers: createdSubsteps,
      message: `${createdSubsteps?.length || 0} trackers générés avec succès`,
    })
  } catch (error) {
    console.error("❌ Erreur lors de la génération des trackers:", error)
    return NextResponse.json(
      { error: "Erreur serveur", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
