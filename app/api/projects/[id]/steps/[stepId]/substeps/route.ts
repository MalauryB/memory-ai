import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// GET - Récupérer toutes les sous-étapes d'une étape
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  try {
    const supabase = createClientFromRequest(request)
    const { id: projectId, stepId } = params

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Vérifier que le projet appartient à l'utilisateur
    if (user) {
      const { data: project } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", projectId)
        .single()

      if (!project || project.user_id !== user.id) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
      }
    }

    // Récupérer les sous-étapes
    const { data: substeps, error } = await supabase
      .from("project_substeps")
      .select("*")
      .eq("step_id", stepId)
      .order("order_index", { ascending: true })

    if (error) {
      console.error("Erreur lors de la récupération des sous-étapes:", error)
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }

    return NextResponse.json({ substeps: substeps || [] })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST - Créer des sous-étapes (peut en créer plusieurs à la fois pour la récurrence)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  try {
    const supabase = createClientFromRequest(request)
    const { id: projectId, stepId } = params
    const { substeps } = await request.json()

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Vérifier que le projet appartient à l'utilisateur
    if (user) {
      const { data: project } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", projectId)
        .single()

      if (!project || project.user_id !== user.id) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
      }
    }

    // Créer les sous-étapes avec gestion de la récurrence
    const substepsToInsert = []
    let orderIndex = 0

    for (const substep of substeps) {
      if (substep.is_recurring && substep.recurrence_count > 1) {
        // Créer plusieurs occurrences pour les tâches récurrentes
        for (let i = 0; i < substep.recurrence_count; i++) {
          let scheduledDate = null

          // Calculer la date en fonction du type de récurrence
          if (substep.recurrence_type === "daily") {
            scheduledDate = new Date()
            scheduledDate.setDate(scheduledDate.getDate() + i)
          } else if (substep.recurrence_type === "weekly") {
            scheduledDate = new Date()
            scheduledDate.setDate(scheduledDate.getDate() + i * 7)
          } else if (substep.recurrence_type === "monthly") {
            scheduledDate = new Date()
            scheduledDate.setMonth(scheduledDate.getMonth() + i)
          }

          substepsToInsert.push({
            step_id: stepId,
            project_id: projectId,
            title: `${substep.title} (${i + 1}/${substep.recurrence_count})`,
            description: substep.description,
            estimated_duration: substep.estimated_duration,
            is_recurring: true,
            recurrence_type: substep.recurrence_type,
            recurrence_count: substep.recurrence_count,
            scheduled_date: scheduledDate ? scheduledDate.toISOString().split("T")[0] : null,
            order_index: orderIndex++,
            status: "pending",
          })
        }
      } else {
        // Créer une seule occurrence
        substepsToInsert.push({
          step_id: stepId,
          project_id: projectId,
          title: substep.title,
          description: substep.description,
          estimated_duration: substep.estimated_duration,
          is_recurring: false,
          recurrence_type: "once",
          recurrence_count: 1,
          scheduled_date: null,
          order_index: orderIndex++,
          status: "pending",
        })
      }
    }

    const { data, error } = await supabase
      .from("project_substeps")
      .insert(substepsToInsert)
      .select()

    if (error) {
      console.error("Erreur lors de la création des sous-étapes:", error)
      return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 })
    }

    return NextResponse.json({ substeps: data })
  } catch (error) {
    console.error("Erreur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
