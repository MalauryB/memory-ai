import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// PATCH - Mettre à jour une sous-étape (notamment son statut)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string; substepId: string }> }
) {
  try {
    const supabase = createClientFromRequest(request)
    const { id: projectId, substepId } = await params
    const body = await request.json()

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

    // Préparer les données de mise à jour
    const updateData: any = {}

    if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status === "completed") {
        updateData.completed_date = new Date().toISOString()
      }
    }

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.scheduled_date !== undefined) updateData.scheduled_date = body.scheduled_date
    if (body.notes !== undefined) updateData.notes = body.notes

    // Mettre à jour la sous-étape
    const { data: substep, error } = await supabase
      .from("project_substeps")
      .update(updateData)
      .eq("id", substepId)
      .select()
      .single()

    if (error) {
      console.error("Erreur lors de la mise à jour de la sous-étape:", error)
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })
    }

    return NextResponse.json({ substep })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE - Supprimer une sous-étape
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string; substepId: string }> }
) {
  try {
    const supabase = createClientFromRequest(request)
    const { id: projectId, substepId } = await params

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

    // Supprimer la sous-étape
    const { error } = await supabase.from("project_substeps").delete().eq("id", substepId)

    if (error) {
      console.error("Erreur lors de la suppression de la sous-étape:", error)
      return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
