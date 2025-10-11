import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClientFromRequest(request)
    const projectId = params.id

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
