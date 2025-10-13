import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// GET - Récupérer toutes les activités personnalisées de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientFromRequest(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { data: activities, error } = await supabase
      .from("custom_activities")
      .select("*")
      .eq("user_id", user?.id || null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erreur récupération activités:", error)
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }

    return NextResponse.json({ activities: activities || [] })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST - Créer une nouvelle activité personnalisée
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientFromRequest(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      icon,
      color,
      activity_type,
      category,
      estimated_duration,
      can_combine_with,
      requires_location,
      location_name,
      location_address,
      suggested_frequency
    } = body

    const { data: activity, error } = await supabase
      .from("custom_activities")
      .insert({
        user_id: user?.id || null,
        title,
        description,
        icon,
        color,
        activity_type,
        category,
        estimated_duration: estimated_duration || "30min",
        can_combine_with,
        requires_location,
        location_name,
        location_address,
        suggested_frequency: suggested_frequency || "flexible"
      })
      .select()
      .single()

    if (error) {
      console.error("Erreur création activité:", error)
      return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 })
    }

    return NextResponse.json({ activity })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
