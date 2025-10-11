import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  try {
    const supabase = createClientFromRequest(request)
    const { id: projectId, stepId } = params
    const { status } = await request.json()

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Vérifier que le statut est valide
    if (!["pending", "in_progress", "completed"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 })
    }

    // Vérifier que le projet appartient à l'utilisateur
    if (user) {
      const { data: project } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", projectId)
        .single()

      if (!project || project.user_id !== user.id) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
      }
    }

    // Mettre à jour l'étape
    const { data: step, error } = await supabase
      .from("project_steps")
      .update({ status })
      .eq("id", stepId)
      .eq("project_id", projectId)
      .select()
      .single()

    if (error) {
      console.error("Erreur lors de la mise à jour de l'étape:", error)
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })
    }

    // Recalculer la progression du projet
    const { data: allSteps } = await supabase
      .from("project_steps")
      .select("status")
      .eq("project_id", projectId)

    if (allSteps) {
      const completedSteps = allSteps.filter((s) => s.status === "completed").length
      const totalSteps = allSteps.length
      const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

      // Mettre à jour la progression du projet
      await supabase
        .from("projects")
        .update({ progress })
        .eq("id", projectId)
    }

    return NextResponse.json({ step })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
