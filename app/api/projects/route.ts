import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"
import { createAPILogger, logError } from "@/lib/logger"
import { rateLimit, addRateLimitHeaders } from "@/lib/rate-limit"
import { checkCSRF } from "@/lib/csrf"
import { validateRequest, createProjectSchema } from "@/lib/validation"

export async function POST(request: NextRequest) {
  const apiLogger = createAPILogger("/api/projects", "POST")
  const startTime = Date.now()

  try {
    // 🔒 SÉCURITÉ: Rate limiting
    const rateLimitResult = await rateLimit('moderate')
    if (!rateLimitResult.success) {
      return rateLimitResult.response
    }

    // 🔒 SÉCURITÉ: CSRF protection
    const csrfCheck = await checkCSRF(request)
    if (!csrfCheck.valid) {
      return csrfCheck.response
    }

    const supabase = createClientFromRequest(request)

    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      apiLogger.warn({ error: authError.message }, "Authentication error")
    }

    if (!user) {
      apiLogger.warn("Unauthorized access attempt")
      return NextResponse.json({ error: "Non authentifié", details: authError?.message }, { status: 401 })
    }

    apiLogger.info({ userId: user.id }, "User authenticated")

    // 🔒 SÉCURITÉ: Validation avec Zod
    const requestData = await request.json()
    const validation = await validateRequest(createProjectSchema, requestData)
    if (!validation.success) {
      return validation.error
    }

    const { title, description, category, startDate, deadline, imageUrl, steps } = validation.data

    apiLogger.info({
      userId: user.id,
      projectData: { title, category, hasSteps: steps?.length > 0 }
    }, "Creating project")

    // Créer le projet
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title,
        description,
        category,
        start_date: startDate || null,
        deadline: deadline || null,
        image_url: imageUrl || null,
        progress: 0,
        status: "active",
      })
      .select()
      .single()

    if (projectError) {
      apiLogger.error({
        error: projectError.message,
        code: projectError.code,
        details: projectError.details,
      }, "Failed to create project")

      return NextResponse.json(
        {
          error: "Erreur lors de la création du projet",
          details: projectError.message,
          code: projectError.code
        },
        { status: 500 }
      )
    }

    apiLogger.info({ projectId: project.id }, "Project created successfully")

    // Créer les étapes du projet si elles existent
    if (steps && steps.length > 0) {
      apiLogger.info({ projectId: project.id, stepsCount: steps.length }, "Creating project steps")

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
        apiLogger.warn({
          projectId: project.id,
          error: stepsError.message,
        }, "Failed to create project steps (project still created)")
      } else {
        apiLogger.info({ projectId: project.id, stepsCount: steps.length }, "Project steps created")
      }
    }

    const duration = Date.now() - startTime
    apiLogger.info({
      projectId: project.id,
      duration: `${duration}ms`,
    }, "Project creation completed")

    // Retourner avec les headers de rate limit
    const response = NextResponse.json({ project, success: true })
    return addRateLimitHeaders(response, rateLimitResult.headers)
  } catch (error) {
    logError(error, "POST /api/projects")
    return NextResponse.json(
      { error: "Erreur lors de la création du projet" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const apiLogger = createAPILogger("/api/projects", "GET")
  const startTime = Date.now()

  try {
    // 🔒 SÉCURITÉ: Rate limiting (relaxed pour GET)
    const rateLimitResult = await rateLimit('relaxed')
    if (!rateLimitResult.success) {
      return rateLimitResult.response
    }

    const supabase = createClientFromRequest(request)

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      apiLogger.warn("Unauthorized access attempt")
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    apiLogger.info({ userId: user.id }, "Fetching projects")

    // ⚡ OPTIMISATION : Récupérer projets ET count des étapes en parallèle
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*, project_steps(id)")  // Récupère seulement les IDs des étapes
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (projectsError) {
      apiLogger.error({ error: projectsError.message }, "Failed to fetch projects")
      return NextResponse.json(
        { error: "Erreur lors de la récupération des projets" },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    apiLogger.info({
      userId: user.id,
      projectsCount: projects?.length || 0,
      duration: `${duration}ms`,
    }, "Projects fetched successfully")

    // Retourner avec les headers de rate limit
    const response = NextResponse.json({ projects })
    return addRateLimitHeaders(response, rateLimitResult.headers)
  } catch (error) {
    logError(error, "GET /api/projects")
    return NextResponse.json(
      { error: "Erreur lors de la récupération des projets" },
      { status: 500 }
    )
  }
}
