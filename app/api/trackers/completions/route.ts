import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// GET /api/trackers/completions - Récupérer les complétions pour une date
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

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    if (!date) {
      return NextResponse.json({ error: "Date requise" }, { status: 400 })
    }

    // TODO: Implémenter la récupération depuis la base de données
    // Pour l'instant, simuler quelques complétions
    const mockCompletions = [
      {
        id: "1",
        tracker_id: "1", // Méditation complétée
        completion_date: date,
        completed_at: new Date().toISOString(),
        notes: null,
        created_at: new Date().toISOString(),
      },
    ]

    return NextResponse.json({ completions: mockCompletions })
  } catch (error) {
    console.error("Erreur lors de la récupération des complétions:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
