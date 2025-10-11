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

    // Récupérer le profil
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user?.id || "")
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = pas de ligne trouvée
      console.error("Erreur lors de la récupération du profil:", error)
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }

    // Si le profil n'existe pas, retourner un profil vide
    if (!profile) {
      return NextResponse.json({
        profile: {
          user_id: user?.id,
          full_name: "",
          bio: "",
          avatar_url: "",
          location: "",
          timezone: "Europe/Paris",
          work_hours_start: "09:00:00",
          work_hours_end: "18:00:00",
          preferred_work_days: [1, 2, 3, 4, 5],
          daily_work_hours: 8,
          notification_enabled: true,
          notification_time: "09:00:00",
        },
      })
    }

    return NextResponse.json({ profile })
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

    // Vérifier si le profil existe déjà
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", user?.id || "")
      .single()

    let result

    if (existingProfile) {
      // Mettre à jour le profil existant
      result = await supabase
        .from("user_profiles")
        .update({
          full_name: body.full_name,
          bio: body.bio,
          avatar_url: body.avatar_url,
          location: body.location,
          timezone: body.timezone,
          work_hours_start: body.work_hours_start,
          work_hours_end: body.work_hours_end,
          preferred_work_days: body.preferred_work_days,
          daily_work_hours: body.daily_work_hours,
          notification_enabled: body.notification_enabled,
          notification_time: body.notification_time,
        })
        .eq("user_id", user?.id || "")
        .select()
        .single()
    } else {
      // Créer un nouveau profil
      result = await supabase
        .from("user_profiles")
        .insert({
          user_id: user?.id,
          full_name: body.full_name,
          bio: body.bio,
          avatar_url: body.avatar_url,
          location: body.location,
          timezone: body.timezone,
          work_hours_start: body.work_hours_start,
          work_hours_end: body.work_hours_end,
          preferred_work_days: body.preferred_work_days,
          daily_work_hours: body.daily_work_hours,
          notification_enabled: body.notification_enabled,
          notification_time: body.notification_time,
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error("Erreur lors de la sauvegarde du profil:", result.error)
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 })
    }

    return NextResponse.json({ profile: result.data })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
