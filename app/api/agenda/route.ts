import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

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

    // Pour chaque projet, ne garder que l'étape en cours et la suivante (n+1)
    const upcomingSteps = projects?.flatMap((project) => {
      // Trier les étapes du projet par order_index
      const sortedSteps = [...project.project_steps].sort((a, b) => a.order_index - b.order_index)

      // Trouver l'étape en cours (in_progress)
      const inProgressStep = sortedSteps.find(step => step.status === "in_progress")

      // Trouver la prochaine étape (première pending)
      const nextStep = sortedSteps.find(step => step.status === "pending")

      // Créer un tableau avec uniquement l'étape en cours et/ou la suivante
      const stepsToInclude = []
      if (inProgressStep) {
        stepsToInclude.push(inProgressStep)
      }
      if (nextStep) {
        stepsToInclude.push(nextStep)
      }

      // Transformer en format attendu
      return stepsToInclude.map((step) => ({
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
    }) || []

    return NextResponse.json({ steps: upcomingSteps })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
