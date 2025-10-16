import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Récupérer les créneaux bloqués
    const { data: slots, error } = await supabase
      .from("user_blocked_time_slots")
      .select("*")
      .eq("user_id", user?.id || "")
      .order("start_time", { ascending: true })

    if (error) {
      console.error("Erreur lors de la récupération des créneaux:", error)
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }

    return NextResponse.json({ slots: slots || [] })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const body = await request.json()

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Créer un nouveau créneau bloqué
    const { data: slot, error } = await supabase
      .from("user_blocked_time_slots")
      .insert({
        user_id: user?.id,
        title: body.title,
        description: body.description,
        start_time: body.start_time,
        end_time: body.end_time,
        days_of_week: body.days_of_week,
      })
      .select()
      .single()

    if (error) {
      console.error("Erreur lors de la création du créneau:", error)
      return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 })
    }

    return NextResponse.json({ slot })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
