import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// DELETE - Supprimer une activité personnalisée
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClientFromRequest(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que l'activité appartient à l'utilisateur
    const { data: activity } = await supabase
      .from("custom_activities")
      .select("user_id")
      .eq("id", id)
      .single()

    if (!activity || (user && activity.user_id !== user.id)) {
      return NextResponse.json({ error: "Activité non trouvée ou non autorisée" }, { status: 403 })
    }

    // Supprimer l'activité
    const { error } = await supabase
      .from("custom_activities")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Erreur suppression activité:", error)
      return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
