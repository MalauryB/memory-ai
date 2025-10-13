import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClientFromRequest(request)

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Supprimer toutes les données de l'utilisateur
    // L'ordre est important à cause des contraintes de clés étrangères

    // 1. Récupérer les IDs nécessaires
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)

    const projectIds = projects?.map((p) => p.id) || []

    const { data: steps } = await supabase
      .from("project_steps")
      .select("id")
      .in("project_id", projectIds)

    const stepIds = steps?.map((s) => s.id) || []

    const { data: trackers } = await supabase.from("trackers").select("id").eq("user_id", user.id)

    const trackerIds = trackers?.map((t) => t.id) || []

    const { data: dailyPlans } = await supabase
      .from("daily_plans")
      .select("id")
      .eq("user_id", user.id)

    const dailyPlanIds = dailyPlans?.map((p) => p.id) || []

    // 2. Supprimer les données enfants d'abord
    const deletions = []

    // Supprimer les sous-étapes
    if (stepIds.length > 0) {
      deletions.push(supabase.from("project_substeps").delete().in("step_id", stepIds))
    }

    // Supprimer les étapes
    if (projectIds.length > 0) {
      deletions.push(supabase.from("project_steps").delete().in("project_id", projectIds))
    }

    // Supprimer les entrées de trackers
    if (trackerIds.length > 0) {
      deletions.push(supabase.from("tracker_entries").delete().in("tracker_id", trackerIds))
    }

    // Supprimer les items de plannings journaliers
    if (dailyPlanIds.length > 0) {
      deletions.push(supabase.from("daily_plan_items").delete().in("daily_plan_id", dailyPlanIds))
    }

    // Attendre que toutes les suppressions enfants soient terminées
    await Promise.all(deletions)

    // 3. Supprimer les données parents
    const parentDeletions = [
      supabase.from("projects").delete().eq("user_id", user.id),
      supabase.from("trackers").delete().eq("user_id", user.id),
      supabase.from("daily_plans").delete().eq("user_id", user.id),
      supabase.from("user_blocked_time_slots").delete().eq("user_id", user.id),
      supabase.from("user_profiles").delete().eq("id", user.id),
    ]

    await Promise.all(parentDeletions)

    // 4. Supprimer le compte utilisateur
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id)

    if (deleteUserError) {
      console.error("Erreur lors de la suppression du compte:", deleteUserError)
      // On continue même si la suppression du compte échoue
      // car les données ont été supprimées
    }

    // 5. Déconnecter l'utilisateur
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors de la suppression:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
