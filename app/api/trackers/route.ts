import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// GET /api/trackers - Récupérer tous les trackers de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // TODO: Implémenter la récupération depuis la base de données
    // Pour l'instant, retourner des données mockées
    const mockTrackers = [
      {
        id: "1",
        user_id: user.id,
        title: "Méditation quotidienne",
        description: "15 minutes de méditation chaque matin",
        category: "Bien-être",
        frequency: "daily",
        frequency_value: 1,
        start_date: "2025-01-01",
        end_date: null,
        total_completions: 45,
        current_streak: 7,
        best_streak: 12,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-10T00:00:00Z",
        is_active: true,
      },
      {
        id: "2",
        user_id: user.id,
        title: "Sport",
        description: "Séance de sport de 30 minutes",
        category: "Santé",
        frequency: "every_x_days",
        frequency_value: 2,
        start_date: "2025-01-01",
        end_date: null,
        total_completions: 22,
        current_streak: 3,
        best_streak: 8,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-10T00:00:00Z",
        is_active: true,
      },
      {
        id: "3",
        user_id: user.id,
        title: "Lecture",
        description: "Lire au moins 20 pages",
        category: "Personnel",
        frequency: "daily",
        frequency_value: 1,
        start_date: "2025-01-01",
        end_date: null,
        total_completions: 38,
        current_streak: 5,
        best_streak: 15,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-10T00:00:00Z",
        is_active: true,
      },
    ]

    return NextResponse.json({ trackers: mockTrackers })
  } catch (error) {
    console.error("Erreur lors de la récupération des trackers:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/trackers - Créer un nouveau tracker
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

    // TODO: Valider les données et insérer dans la base de données

    return NextResponse.json({ success: true, tracker: { id: "new-id", ...body } })
  } catch (error) {
    console.error("Erreur lors de la création du tracker:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
