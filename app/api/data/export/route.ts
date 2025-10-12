import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

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

    // Récupérer toutes les données de l'utilisateur
    const [profile, projects, trackers, dailyPlans, blockedSlots] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("id", user.id).single(),
      supabase.from("projects").select("*").eq("user_id", user.id),
      supabase.from("trackers").select("*").eq("user_id", user.id),
      supabase.from("daily_plans").select("*").eq("user_id", user.id),
      supabase.from("user_blocked_time_slots").select("*").eq("user_id", user.id),
    ])

    // Récupérer les étapes et sous-étapes des projets
    const projectIds = projects.data?.map((p) => p.id) || []
    let steps = { data: [], error: null }
    let substeps = { data: [], error: null }

    if (projectIds.length > 0) {
      steps = await supabase.from("project_steps").select("*").in("project_id", projectIds)

      const stepIds = steps.data?.map((s) => s.id) || []
      if (stepIds.length > 0) {
        substeps = await supabase.from("project_substeps").select("*").in("step_id", stepIds)
      }
    }

    // Récupérer les entrées de trackers
    const trackerIds = trackers.data?.map((t) => t.id) || []
    let trackerEntries = { data: [], error: null }

    if (trackerIds.length > 0) {
      trackerEntries = await supabase
        .from("tracker_entries")
        .select("*")
        .in("tracker_id", trackerIds)
    }

    // Récupérer les items des plannings journaliers
    const dailyPlanIds = dailyPlans.data?.map((p) => p.id) || []
    let dailyPlanItems = { data: [], error: null }

    if (dailyPlanIds.length > 0) {
      dailyPlanItems = await supabase
        .from("daily_plan_items")
        .select("*")
        .in("daily_plan_id", dailyPlanIds)
    }

    // Construire l'objet de données complet
    const exportData = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
      profile: profile.data || null,
      projects: projects.data || [],
      project_steps: steps.data || [],
      project_substeps: substeps.data || [],
      trackers: trackers.data || [],
      tracker_entries: trackerEntries.data || [],
      daily_plans: dailyPlans.data || [],
      daily_plan_items: dailyPlanItems.data || [],
      blocked_time_slots: blockedSlots.data || [],
    }

    // Retourner les données en JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="life-architect-data-${new Date().toISOString().split("T")[0]}.json"`,
      },
    })
  } catch (error) {
    console.error("Erreur lors de l'export:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
