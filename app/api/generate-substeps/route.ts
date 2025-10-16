import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClientFromRequest } from "@/lib/supabase-server"
import { getUserContext, formatUserContextForAI, getUserRecommendations } from "@/lib/user-context"

const USE_MOCK = process.env.USE_MOCK_AI === "true"

// Mock substeps pour le mode test
const mockSubsteps = [
  {
    title: "Rechercher des ressources d'apprentissage",
    description: "Identifier les meilleurs cours, tutoriels et documentation",
    estimated_duration: "2 heures",
    is_recurring: false,
    recurrence_type: "once",
    recurrence_count: 1,
  },
  {
    title: "Pratiquer 30 minutes par jour",
    description: "Session de pratique quotidienne pour consolider les acquis",
    estimated_duration: "30 minutes",
    is_recurring: true,
    recurrence_type: "daily",
    recurrence_count: 30,
  },
  {
    title: "Faire un projet pratique",
    description: "Appliquer les connaissances dans un projet concret",
    estimated_duration: "5 heures",
    is_recurring: false,
    recurrence_type: "once",
    recurrence_count: 1,
  },
  {
    title: "Révision hebdomadaire",
    description: "Revoir les concepts appris durant la semaine",
    estimated_duration: "1 heure",
    is_recurring: true,
    recurrence_type: "weekly",
    recurrence_count: 4,
  },
]

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)

    // Récupérer l'utilisateur
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { stepTitle, stepDescription, projectTitle, projectCategory } = await request.json()

    if (USE_MOCK) {
      // Simuler un délai de traitement
      await new Promise((resolve) => setTimeout(resolve, 1500))
      return NextResponse.json({ substeps: mockSubsteps })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key manquante" }, { status: 500 })
    }

    const anthropic = new Anthropic({ apiKey })

    // Récupérer le contexte utilisateur
    let userContextText = ""
    if (user) {
      const context = await getUserContext(supabase, user.id)
      const formattedContext = formatUserContextForAI(context)
      const recommendations = getUserRecommendations(context)

      if (formattedContext) {
        userContextText = `\n📋 CONTEXTE UTILISATEUR :\n${formattedContext}${recommendations}\n\n⚡ IMPORTANT : Adapte les sous-étapes selon les disponibilités, routines et contraintes de l'utilisateur.\n`
      }
    }

    const prompt = `Tu es un assistant expert en décomposition de tâches et planification de projets.
${userContextText}
Projet : ${projectTitle}
Catégorie : ${projectCategory}
Étape à décomposer : ${stepTitle}
Description de l'étape : ${stepDescription || "Aucune description"}

Ta mission : Décompose cette étape en sous-étapes détaillées et actionnables.

IMPORTANT :
- Identifie les tâches qui doivent être répétées plusieurs fois (pratique quotidienne, révisions hebdomadaires, etc.)
- Pour chaque sous-étape récurrente, spécifie le type de récurrence et le nombre de répétitions recommandé
- Sois précis et concret dans les descriptions
- Estime la durée de chaque occurrence

Types de récurrence possibles :
- "once" : une seule fois
- "daily" : quotidien
- "weekly" : hebdomadaire
- "monthly" : mensuel

Réponds UNIQUEMENT avec un JSON valide suivant ce format exact (sans markdown, sans backticks) :
{
  "substeps": [
    {
      "title": "Titre court et actionnable",
      "description": "Description détaillée de ce qu'il faut faire",
      "estimated_duration": "Durée estimée (ex: 30 minutes, 2 heures)",
      "is_recurring": true ou false,
      "recurrence_type": "once" | "daily" | "weekly" | "monthly",
      "recurrence_count": nombre de répétitions (1 si once)
    }
  ]
}

Génère entre 3 et 8 sous-étapes pertinentes.`

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== "text") {
      throw new Error("Réponse inattendue de l'API")
    }

    // Parser la réponse JSON
    let substepsData
    try {
      // Nettoyer la réponse si elle contient des markdown code blocks
      let cleanedText = content.text.trim()
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "")
      }
      substepsData = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error("Erreur de parsing:", parseError)
      console.error("Contenu reçu:", content.text)
      return NextResponse.json({ error: "Erreur de format de réponse" }, { status: 500 })
    }

    return NextResponse.json(substepsData)
  } catch (error) {
    console.error("Erreur lors de la génération des sous-étapes:", error)
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 })
  }
}
