import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"
import { getUserContext, formatUserContextForAI, getUserRecommendations } from "@/lib/user-context"
import { trackAIGeneration } from "@/lib/ai-tracking"

// POST /api/projects/[id]/generate-trackers - Générer des trackers à partir d'un projet
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClientFromRequest(request)

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { project_title, project_category } = body

    console.log("🚀 Génération de trackers pour projet:", projectId, project_title)

    // 1. Récupérer le projet et ses étapes
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        *,
        project_steps (
          id,
          title,
          description,
          order_index
        )
      `)
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      console.error("❌ Erreur récupération projet:", projectError)
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 })
    }

    console.log("✅ Projet récupéré:", project.title, "avec", project.project_steps?.length || 0, "étapes")

    // 2. Récupérer les trackers existants pour éviter les doublons
    const { data: existingTrackers } = await supabase
      .from("project_substeps")
      .select("title, description")
      .eq("project_id", projectId)
      .eq("tracking_enabled", true)

    console.log("📊 Trackers existants:", existingTrackers?.length || 0)

    // 3. Utiliser Claude AI pour générer des trackers intelligents et contextuels
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY

    let generatedTrackers = []

    if (anthropicApiKey) {
      console.log("🤖 Utilisation de Claude AI pour générer des trackers intelligents...")

      // 🔥 TRACKING IA : Incrémenter le compteur AVANT la génération
      const trackingResult = await trackAIGeneration(request, user.id)

      if (!trackingResult.success && trackingResult.limit_reached) {
        console.log("❌ Limite de génération IA atteinte pour l'utilisateur:", user.id)
        return NextResponse.json({
          error: 'Limite atteinte',
          message: trackingResult.message,
          limit_reached: true,
          generation_count: trackingResult.generation_count,
          limit: trackingResult.limit,
          account_type: trackingResult.account_type,
        }, { status: 403 })
      }

      console.log("✅ Génération IA trackée:", trackingResult)

      try {
        // Récupérer le contexte utilisateur
        let userContextText = ""
        const context = await getUserContext(supabase, user.id)
        const formattedContext = formatUserContextForAI(context)
        const recommendations = getUserRecommendations(context)

        if (formattedContext) {
          userContextText = `\n📋 CONTEXTE UTILISATEUR :\n${formattedContext}${recommendations}\n\n⚡ IMPORTANT : Propose des trackers qui s'intègrent naturellement dans le rythme et les routines de l'utilisateur.\n`
        }

        // Préparer le contexte pour Claude
        const projectContext = {
          title: project.title,
          description: project.description,
          category: project.category,
          steps: project.project_steps?.map((s: any) => ({
            title: s.title,
            description: s.description
          })),
          existingTrackers: existingTrackers?.map((t: any) => t.title) || []
        }

        const prompt = `Tu es un expert en formation d'habitudes et planification de vie.
${userContextText}
Analyse ce projet et génère 3-5 NOUVEAUX trackers d'habitudes CONCRETS et ACTIONNABLES pour aider l'utilisateur à réussir ce projet.

Projet:
Titre: ${projectContext.title}
Description: ${projectContext.description}
Catégorie: ${projectContext.category || "Non spécifiée"}
Étapes du projet: ${JSON.stringify(projectContext.steps, null, 2)}

${projectContext.existingTrackers.length > 0 ? `
⚠️ TRACKERS DÉJÀ EXISTANTS (NE PAS DUPLIQUER) :
${projectContext.existingTrackers.map((t: string) => `- ${t}`).join('\n')}

Tu DOIS générer des trackers DIFFÉRENTS et COMPLÉMENTAIRES à ceux qui existent déjà.
Si tous les aspects importants sont déjà couverts, propose des trackers plus avancés ou des variantes.
` : ''}

IMPORTANT - Les trackers doivent être:
1. **Concrets et actionnables** (ex: "Préparer son sac de sport la veille", pas "Travailler sur le projet")
2. **Spécifiques au contexte** du projet (sport → hydratation, échauffement ; apprentissage → révision, pratique)
3. **Habitudes quotidiennes ou régulières** qui supportent le projet
4. **Variés** : préparation, action, récupération, maintenance
5. **Réalistes** et faciles à suivre

Exemples pour un projet "Courir un marathon":
- "Préparer mon sac de sport la veille" (daily)
- "M'hydrater : boire 2L d'eau" (daily)
- "Faire mes étirements post-course" (daily)
- "Préparer mes repas fitness du lendemain" (daily)
- "Repos actif : marche 30min" (every_x_days: 2)

Exemples pour un projet "Apprendre le piano":
- "Pratiquer mes gammes 15min" (daily)
- "Réviser le morceau de la semaine" (daily)
- "Accorder mon piano" (weekly)
- "Écouter 3 morceaux de référence" (every_x_days: 2)

Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de \`\`\`):
{
  "trackers": [
    {
      "title": "Titre court et clair",
      "description": "Description de l'habitude",
      "recurrence_type": "daily" | "every_x_days" | "weekly",
      "recurrence_value": 1,
      "icon": "target" | "dumbbell" | "droplet" | "flame" | "book" | "utensils" | "heart" | "check-circle",
      "color": "#6366f1" | "#ef4444" | "#10b981" | "#f59e0b" | "#8b5cf6"
    }
  ]
}`

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 2048,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const aiResponse = data.content[0].text
          console.log("🤖 Réponse Claude:", aiResponse)

          // Parser la réponse JSON
          const parsed = JSON.parse(aiResponse)
          generatedTrackers = parsed.trackers || []
          console.log("✅ IA a généré", generatedTrackers.length, "trackers")
        } else {
          console.error("❌ Erreur API Claude:", await response.text())
        }
      } catch (error) {
        console.error("❌ Erreur lors de la génération IA:", error)
      }
    }

    // Fallback : si pas d'IA ou erreur, générer des trackers basiques
    if (generatedTrackers.length === 0) {
      console.log("⚠️ Utilisation des trackers par défaut (pas d'IA)")
      generatedTrackers = [
        {
          title: `Travail quotidien sur ${project.title}`,
          description: `Consacrer du temps à l'avancement de ${project.title}`,
          recurrence_type: "daily",
          recurrence_value: 1,
          icon: "target",
          color: "#6366f1"
        }
      ]
    }

    // 3. Créer les substeps à partir des trackers générés
    const substepsToCreate = generatedTrackers.map((tracker: any, index: number) => ({
      project_id: projectId,
      step_id: project.project_steps?.[0]?.id || null,
      title: tracker.title,
      description: tracker.description,
      tracking_enabled: true,
      recurrence_type: tracker.recurrence_type,
      recurrence_value: tracker.recurrence_value,
      recurrence_start_date: new Date().toISOString().split("T")[0],
      status: "pending",
      order_index: index,
      icon: tracker.icon || "target",
      color: tracker.color || "#6366f1"
    }))

    console.log("📝 Substeps à créer:", substepsToCreate.length)

    // 3. Insérer les substeps trackées dans la base de données
    const { data: createdSubsteps, error: substepsError } = await supabase
      .from("project_substeps")
      .insert(substepsToCreate)
      .select()

    if (substepsError) {
      console.error("❌ Erreur création substeps:", substepsError)
      return NextResponse.json(
        { error: "Erreur lors de la création des trackers", details: substepsError.message },
        { status: 500 }
      )
    }

    console.log("✅ Trackers créés:", createdSubsteps?.length || 0)

    return NextResponse.json({
      success: true,
      trackers: createdSubsteps,
      message: `${createdSubsteps?.length || 0} trackers générés avec succès`,
    })
  } catch (error) {
    console.error("❌ Erreur lors de la génération des trackers:", error)
    return NextResponse.json(
      { error: "Erreur serveur", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
