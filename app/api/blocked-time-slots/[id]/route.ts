import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClientFromRequest(request)
    const { id } = await params

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Supprimer le créneau
    const { error } = await supabase
      .from("user_blocked_time_slots")
      .delete()
      .eq("id", id)
      .eq("user_id", user?.id || "")

    if (error) {
      console.error("Erreur lors de la suppression:", error)
      return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClientFromRequest(request)
    const body = await request.json()
    const { id } = await params

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Mettre à jour le créneau
    const { data: slot, error } = await supabase
      .from("user_blocked_time_slots")
      .update({
        title: body.title,
        description: body.description,
        start_time: body.start_time,
        end_time: body.end_time,
        days_of_week: body.days_of_week,
      })
      .eq("id", id)
      .eq("user_id", user?.id || "")
      .select()
      .single()

    if (error) {
      console.error("Erreur lors de la mise à jour:", error)
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })
    }

    return NextResponse.json({ slot })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
