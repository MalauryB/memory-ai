import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// PATCH - Mettre à jour un item du planning (complétion)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClientFromRequest(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const { error } = await supabase
      .from("daily_plan_items")
      .update({
        completed: body.completed,
        completed_at: body.completed ? new Date().toISOString() : null
      })
      .eq("id", id)

    if (error) {
      console.error("Erreur mise à jour item:", error)
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE - Supprimer un item du planning
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClientFromRequest(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que l'item appartient à l'utilisateur via daily_plan
    const { data: item } = await supabase
      .from("daily_plan_items")
      .select("daily_plan_id, daily_plans!inner(user_id)")
      .eq("id", id)
      .single()

    if (!item || (user && item.daily_plans.user_id !== user.id)) {
      return NextResponse.json({ error: "Item non trouvé ou non autorisé" }, { status: 403 })
    }

    // Supprimer l'item
    const { error } = await supabase
      .from("daily_plan_items")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Erreur suppression item:", error)
      return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
