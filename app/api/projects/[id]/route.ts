import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClientFromRequest(request)
    const { id: projectId } = await params

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Récupérer le projet avec ses étapes
    const { data: project, error } = await supabase
      .from("projects")
      .select(`
        *,
        project_steps (*)
      `)
      .eq("id", projectId)
      .single()

    if (error) {
      console.error("Erreur lors de la récupération du projet:", error)
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })
    }

    // Vérifier que le projet appartient à l'utilisateur
    if (user && project.user_id !== user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    // Trier les étapes par order_index
    if (project.project_steps) {
      project.project_steps.sort((a: any, b: any) => a.order_index - b.order_index)
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClientFromRequest(request)
    const { id: projectId } = await params
    const { title, description, category, startDate, deadline, steps } = await request.json()

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
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

    // Mettre à jour les informations du projet
    const { error: projectError } = await supabase
      .from("projects")
      .update({
        title,
        description,
        category,
        start_date: startDate || null,
        deadline: deadline || null,
      })
      .eq("id", projectId)

    if (projectError) {
      console.error("Erreur lors de la mise à jour du projet:", projectError)
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })
    }

    // Récupérer les étapes existantes
    const { data: existingSteps } = await supabase
      .from("project_steps")
      .select("id")
      .eq("project_id", projectId)

    const existingStepIds = new Set(existingSteps?.map((s) => s.id) || [])
    const incomingStepIds = new Set(
      steps.filter((s: any) => !s.id.startsWith("temp-")).map((s: any) => s.id)
    )

    // Supprimer les étapes qui ne sont plus présentes
    const stepsToDelete = Array.from(existingStepIds).filter((id) => !incomingStepIds.has(id))
    if (stepsToDelete.length > 0) {
      await supabase.from("project_steps").delete().in("id", stepsToDelete)
    }

    // Mettre à jour ou insérer les étapes
    for (const step of steps) {
      const stepData = {
        project_id: projectId,
        title: step.title,
        description: step.description,
        estimated_duration: step.estimated_duration,
        status: step.status,
        order_index: step.order_index,
      }

      if (step.id.startsWith("temp-")) {
        // Nouvelle étape
        await supabase.from("project_steps").insert(stepData)
      } else {
        // Étape existante
        await supabase.from("project_steps").update(stepData).eq("id", step.id)
      }
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

      await supabase.from("projects").update({ progress }).eq("id", projectId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
