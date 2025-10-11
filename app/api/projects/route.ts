import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)

    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log("User from auth:", user)
    console.log("Auth error:", authError)

    // MODE TEST : Désactiver temporairement la vérification d'auth
    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié", details: authError?.message }, { status: 401 })
    }

    const { title, description, category, deadline, steps } = await request.json()

    if (!title || !description) {
      return NextResponse.json(
        { error: "Le titre et la description sont requis" },
        { status: 400 }
      )
    }

    console.log("Tentative de création du projet avec user_id:", user?.id)
    console.log("Données du projet:", { title, description, category, deadline })

    // Créer le projet
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: user?.id || "00000000-0000-0000-0000-000000000000", // UUID temporaire si pas d'user
        title,
        description,
        category,
        deadline: deadline || null,
        progress: 0,
        status: "active",
      })
      .select()
      .single()

    if (projectError) {
      console.error("❌ Erreur lors de la création du projet:", projectError)
      console.error("Code d'erreur:", projectError.code)
      console.error("Message:", projectError.message)
      console.error("Détails:", projectError.details)
      return NextResponse.json(
        {
          error: "Erreur lors de la création du projet",
          details: projectError.message,
          code: projectError.code
        },
        { status: 500 }
      )
    }

    console.log("✅ Projet créé avec succès:", project.id)

    // Créer les étapes du projet si elles existent
    if (steps && steps.length > 0) {
      const stepsToInsert = steps.map((step: any, index: number) => ({
        project_id: project.id,
        title: step.title,
        description: step.description || null,
        estimated_duration: step.estimatedDuration || null,
        order_index: index,
        status: "pending",
      }))

      const { error: stepsError } = await supabase
        .from("project_steps")
        .insert(stepsToInsert)

      if (stepsError) {
        console.error("Erreur lors de la création des étapes:", stepsError)
        // Ne pas échouer complètement si les étapes échouent
        // Le projet est déjà créé
      }
    }

    return NextResponse.json({ project, success: true })
  } catch (error) {
    console.error("Erreur lors de la création du projet:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du projet" },
      { status: 500 }
    )
  }
}

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

    // Récupérer les projets de l'utilisateur
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select(`
        *,
        project_steps (*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (projectsError) {
      console.error("Erreur lors de la récupération des projets:", projectsError)
      return NextResponse.json(
        { error: "Erreur lors de la récupération des projets" },
        { status: 500 }
      )
    }

    return NextResponse.json({ projects })
  } catch (error) {
    console.error("Erreur lors de la récupération des projets:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des projets" },
      { status: 500 }
    )
  }
}
