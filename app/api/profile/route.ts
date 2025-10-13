import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientFromRequest(request)

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
      .eq("id", user?.id || "")
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
          id: user?.id,
          full_name: "",
          bio: "",
          avatar_url: "",
          timezone: "Europe/Paris",
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
    const supabase = await createClientFromRequest(request)
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
      .eq("id", user?.id || "")
      .single()

    let result

    // Préparer les données de base qui existent toujours
    const baseData: Record<string, unknown> = {
      full_name: body.full_name,
      bio: body.bio,
      avatar_url: body.avatar_url,
      timezone: body.timezone,
    }

    // Ajouter les champs optionnels seulement s'ils sont présents dans le body
    const optionalFields = [
      'birth_date',
      'gender',
      'wake_up_time',
      'sleep_time',
      'morning_routine',
      'morning_routine_duration',
      'night_routine',
      'night_routine_duration',
      'work_hours_start',
      'work_hours_end',
      'preferred_work_days',
      'daily_work_hours',
      'notification_enabled',
      'notification_time',
      'location'
    ]

    // Vérifier quels champs existent en testant un SELECT sur le profil existant
    // On n'inclut que les champs qui existent dans la table
    for (const field of optionalFields) {
      if (body[field] !== undefined) {
        baseData[field] = body[field]
      }
    }

    if (existingProfile) {
      // Mettre à jour le profil existant
      result = await supabase
        .from("user_profiles")
        .update(baseData)
        .eq("id", user?.id || "")
        .select()
        .single()
    } else {
      // Créer un nouveau profil
      result = await supabase
        .from("user_profiles")
        .insert({
          id: user?.id,
          ...baseData
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
