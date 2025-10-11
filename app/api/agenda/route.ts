import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

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

    // Récupérer tous les projets de l'utilisateur avec leurs étapes non terminées
    const { data: projects, error } = await supabase
      .from("projects")
      .select(`
        id,
        title,
        category,
        deadline,
        image_url,
        project_steps!inner (
          id,
          title,
          description,
          estimated_duration,
          status,
          order_index
        )
      `)
      .eq("user_id", user?.id || "")
      .in("project_steps.status", ["pending", "in_progress"])
      .order("deadline", { ascending: true, nullsFirst: false })

    if (error) {
      console.error("Erreur lors de la récupération des étapes:", error)
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }

    // Transformer les données pour avoir une liste plate d'étapes avec leur projet
    const upcomingSteps = projects?.flatMap((project) =>
      project.project_steps.map((step) => ({
        stepId: step.id,
        stepTitle: step.title,
        stepDescription: step.description,
        stepEstimatedDuration: step.estimated_duration,
        stepStatus: step.status,
        stepOrderIndex: step.order_index,
        projectId: project.id,
        projectTitle: project.title,
        projectCategory: project.category,
        projectDeadline: project.deadline,
        projectImageUrl: project.image_url,
      }))
    ) || []

    // Trier les étapes : d'abord par statut (in_progress avant pending), puis par order_index
    upcomingSteps.sort((a, b) => {
      // Priorité aux étapes en cours
      if (a.stepStatus === "in_progress" && b.stepStatus !== "in_progress") return -1
      if (a.stepStatus !== "in_progress" && b.stepStatus === "in_progress") return 1

      // Ensuite par ordre dans le projet
      return a.stepOrderIndex - b.stepOrderIndex
    })

    return NextResponse.json({ steps: upcomingSteps })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
