import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// DELETE /api/trackers/[id] - Supprimer un tracker
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClientFromRequest(request)

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: trackerId } = await params

    console.log("🗑️ Suppression du tracker:", trackerId)

    // Vérifier que le tracker appartient à l'utilisateur
    const { data: tracker, error: fetchError } = await supabase
      .from("project_substeps")
      .select("*, projects!inner(user_id)")
      .eq("id", trackerId)
      .eq("tracking_enabled", true)
      .single()

    if (fetchError || !tracker) {
      console.error("❌ Tracker non trouvé:", fetchError)
      return NextResponse.json({ error: "Tracker non trouvé" }, { status: 404 })
    }

    if (tracker.projects.user_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    // Supprimer le tracker (substep)
    const { error: deleteError } = await supabase
      .from("project_substeps")
      .delete()
      .eq("id", trackerId)

    if (deleteError) {
      console.error("❌ Erreur suppression:", deleteError)
      return NextResponse.json(
        { error: "Erreur lors de la suppression", details: deleteError.message },
        { status: 500 }
      )
    }

    console.log("✅ Tracker supprimé avec succès")

    return NextResponse.json({ success: true, message: "Tracker supprimé" })
  } catch (error) {
    console.error("❌ Erreur lors de la suppression du tracker:", error)
    return NextResponse.json(
      { error: "Erreur serveur", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// PATCH /api/trackers/[id] - Modifier un tracker
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClientFromRequest(request)

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: trackerId } = await params
    const body = await request.json()

    console.log("✏️ Modification du tracker:", trackerId, body)

    // Vérifier que le tracker appartient à l'utilisateur
    const { data: tracker, error: fetchError } = await supabase
      .from("project_substeps")
      .select("*, projects!inner(user_id)")
      .eq("id", trackerId)
      .eq("tracking_enabled", true)
      .single()

    if (fetchError || !tracker) {
      console.error("❌ Tracker non trouvé:", fetchError)
      return NextResponse.json({ error: "Tracker non trouvé" }, { status: 404 })
    }

    if (tracker.projects.user_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    // Préparer les données à mettre à jour
    const updateData: any = {}

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.recurrence_type !== undefined) updateData.recurrence_type = body.recurrence_type
    if (body.recurrence_value !== undefined) updateData.recurrence_value = body.recurrence_value
    if (body.recurrence_days !== undefined) updateData.recurrence_days = body.recurrence_days
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.color !== undefined) updateData.color = body.color
    if (body.status !== undefined) updateData.status = body.status

    // Mettre à jour le tracker
    const { data: updatedTracker, error: updateError } = await supabase
      .from("project_substeps")
      .update(updateData)
      .eq("id", trackerId)
      .select()
      .single()

    if (updateError) {
      console.error("❌ Erreur modification:", updateError)
      return NextResponse.json(
        { error: "Erreur lors de la modification", details: updateError.message },
        { status: 500 }
      )
    }

    console.log("✅ Tracker modifié avec succès")

    return NextResponse.json({ success: true, tracker: updatedTracker })
  } catch (error) {
    console.error("❌ Erreur lors de la modification du tracker:", error)
    return NextResponse.json(
      { error: "Erreur serveur", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
