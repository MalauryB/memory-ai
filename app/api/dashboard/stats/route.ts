import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"

// GET /api/dashboard/stats - Récupérer les statistiques du dashboard
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const TEST_MODE = process.env.TEST_MODE_NO_AUTH === "true"

    if (!user && !TEST_MODE) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const today = new Date().toISOString().split("T")[0]

    // 1. Compter les projets actifs
    const { count: activeProjectsCount } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user?.id || null)
      .eq("status", "active")

    // 2. Compter les tâches du planning d'aujourd'hui
    const { data: dailyPlan } = await supabase
      .from("daily_plans")
      .select("total_tasks, completed_tasks")
      .eq("user_id", user?.id || null)
      .eq("plan_date", today)
      .single()

    const tasksToday = dailyPlan?.total_tasks || 0
    const completedToday = dailyPlan?.completed_tasks || 0

    // 3. Calculer la progression globale (substeps complétées / total)
    const { data: allSubsteps } = await supabase
      .from("project_substeps")
      .select(`
        id,
        status,
        project:projects!inner (
          user_id,
          status
        )
      `)
      .eq("projects.user_id", user?.id || null)
      .eq("projects.status", "active")

    const totalSubsteps = allSubsteps?.length || 0
    const completedSubsteps = allSubsteps?.filter(s => s.status === "completed").length || 0
    const progressPercentage = totalSubsteps > 0
      ? Math.round((completedSubsteps / totalSubsteps) * 100)
      : 0

    // 4. Récupérer les 3 projets les plus récents ou prioritaires
    const { data: recentProjects } = await supabase
      .from("projects")
      .select(`
        id,
        title,
        category,
        deadline,
        start_date,
        project_substeps (
          id,
          status
        )
      `)
      .eq("user_id", user?.id || null)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(3)

    const projectsPreview = (recentProjects || []).map((project: any) => {
      const totalSteps = project.project_substeps?.length || 0
      const completedSteps = project.project_substeps?.filter((s: any) => s.status === "completed").length || 0
      const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

      // Calculer les jours restants
      let deadline = "Pas de deadline"
      if (project.deadline) {
        const daysRemaining = Math.ceil(
          (new Date(project.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysRemaining < 0) {
          deadline = "En retard"
        } else if (daysRemaining === 0) {
          deadline = "Aujourd'hui"
        } else if (daysRemaining === 1) {
          deadline = "1 jour restant"
        } else if (daysRemaining < 30) {
          deadline = `${daysRemaining} jours restants`
        } else if (daysRemaining < 365) {
          const months = Math.round(daysRemaining / 30)
          deadline = `${months} mois restant${months > 1 ? 's' : ''}`
        } else {
          const years = Math.round(daysRemaining / 365)
          deadline = `${years} an${years > 1 ? 's' : ''} restant${years > 1 ? 's' : ''}`
        }
      }

      return {
        id: project.id,
        title: project.title,
        progress,
        deadline,
        category: project.category || "Général"
      }
    })

    return NextResponse.json({
      stats: {
        activeProjects: activeProjectsCount || 0,
        tasksToday,
        completedToday,
        progressPercentage
      },
      projectsPreview
    })
  } catch (error) {
    console.error("Erreur récupération stats:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
