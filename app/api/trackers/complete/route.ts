import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// POST /api/trackers/complete - Marquer un tracker comme complété
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { tracker_id, completion_date, notes } = body

    if (!tracker_id || !completion_date) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
    }

    // TODO: Implémenter l'insertion dans la base de données
    // 1. Vérifier que le tracker appartient à l'utilisateur
    // 2. Vérifier qu'il n'y a pas déjà une complétion pour cette date
    // 3. Insérer la nouvelle complétion
    // 4. Mettre à jour les statistiques du tracker (streak, total_completions, etc.)

    const mockCompletion = {
      id: `completion-${Date.now()}`,
      tracker_id,
      completion_date,
      completed_at: new Date().toISOString(),
      notes: notes || null,
      created_at: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, completion: mockCompletion })
  } catch (error) {
    console.error("Erreur lors de la complétion du tracker:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
