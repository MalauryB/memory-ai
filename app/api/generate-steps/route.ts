import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"
import { createClientFromRequest } from "@/lib/supabase-server"
import { getUserContext, formatUserContextForAI, getUserRecommendations } from "@/lib/user-context"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Mode mock pour tester sans appeler l'API
const USE_MOCK = process.env.USE_MOCK_AI === "true"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)

    // Récupérer l'utilisateur
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { title, description, category, startDate, deadline } = await request.json()

    if (!title || !description) {
      return NextResponse.json(
        { error: "Le titre et la description sont requis" },
        { status: 400 }
      )
    }

    // Si mode mock activé, retourner des données mockées
    if (USE_MOCK) {
      // Simuler un délai d'API
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockSteps = [
        {
          title: "Recherche et planification initiale",
          description: `Analyser en détail les exigences du projet "${title}". Identifier les ressources nécessaires, établir un calendrier préliminaire et définir les jalons principaux.`,
          estimatedDuration: "1-2 semaines",
        },
        {
          title: "Acquisition des compétences de base",
          description: "Se former sur les fondamentaux nécessaires. Suivre des tutoriels, lire de la documentation et pratiquer avec des exercices simples.",
          estimatedDuration: "3-4 semaines",
        },
        {
          title: "Première mise en pratique",
          description: "Réaliser un petit projet pilote pour appliquer les connaissances acquises. Identifier les points à améliorer.",
          estimatedDuration: "2-3 semaines",
        },
        {
          title: "Développement des compétences avancées",
          description: "Approfondir les aspects plus complexes. Explorer les meilleures pratiques et les techniques avancées du domaine.",
          estimatedDuration: "4-6 semaines",
        },
        {
          title: "Projet principal",
          description: "Travailler sur le projet principal qui démontre la maîtrise des compétences. Itérer et améliorer continuellement.",
          estimatedDuration: "6-8 semaines",
        },
        {
          title: "Finalisation et optimisation",
          description: "Peaufiner les détails, optimiser les performances, corriger les derniers bugs et préparer la présentation finale.",
          estimatedDuration: "2-3 semaines",
        },
      ]

      return NextResponse.json({ steps: mockSteps })
    }

    // Calculer la période totale disponible si on a les dates
    let periodInfo = ""
    let totalDays = 0

    if (startDate && deadline) {
      const start = new Date(startDate)
      const end = new Date(deadline)
      totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      const months = Math.floor(totalDays / 30)
      const weeks = Math.floor(totalDays / 7)

      periodInfo = `
PÉRIODE TOTALE DISPONIBLE : ${totalDays} jours (environ ${weeks} semaines / ${months} mois)
Date de début : ${start.toLocaleDateString("fr-FR")}
Date de fin : ${end.toLocaleDateString("fr-FR")}

⚠️ IMPORTANT : Les durées estimées de TOUTES les étapes DOIVENT s'additionner pour correspondre approximativement à ${totalDays} jours.
Distribue intelligemment le temps disponible entre les étapes en fonction de leur complexité.`
    } else if (deadline) {
      periodInfo = `Date limite : ${deadline} (analyse et propose des durées cohérentes avec cette échéance)`
    } else if (startDate) {
      periodInfo = `Date de début : ${startDate} (propose des durées réalistes pour chaque étape)`
    } else {
      periodInfo = "Aucune contrainte temporelle définie (propose des durées réalistes génériques)"
    }

    // Récupérer le contexte utilisateur
    let userContextText = ""
    if (user) {
      const context = await getUserContext(supabase, user.id)
      const formattedContext = formatUserContextForAI(context)
      const recommendations = getUserRecommendations(context)

      if (formattedContext) {
        userContextText = `\n📋 CONTEXTE UTILISATEUR :\n${formattedContext}${recommendations}\n\n⚡ IMPORTANT : Tiens compte de ce contexte pour adapter les étapes aux contraintes horaires, routines et créneaux bloqués de l'utilisateur.\n`
      }
    }

    const prompt = `Tu es un assistant expert en planification de projets et en décomposition d'objectifs.
${userContextText}
Un utilisateur souhaite atteindre le projet suivant :

Titre : ${title}
Catégorie : ${category || "Non spécifiée"}
Description : ${description}

${periodInfo}

Ta tâche est de décomposer ce projet en étapes concrètes, actionnables et réalistes. Pour chaque étape, fournis :
1. Un titre clair et concis
2. Une description détaillée de ce qu'il faut faire
3. Une estimation de durée PRÉCISE en jours (ex: "14 jours", "30 jours", "7 jours")

${totalDays > 0 ? `
RÈGLES STRICTES pour les durées :
- La SOMME totale des durées doit être proche de ${totalDays} jours (±10%)
- Exprime TOUJOURS les durées en JOURS (pas de "semaines" ou "mois")
- Répartis le temps intelligemment selon la complexité de chaque étape
- Les étapes préparatoires sont généralement plus courtes
- Les étapes de mise en pratique sont généralement plus longues

Exemple de répartition pour ${totalDays} jours :
- Si tu as 5 étapes et ${totalDays} jours → chaque étape fait en moyenne ${Math.round(totalDays / 5)} jours
- Ajuste ensuite selon la complexité : les étapes simples moins, les étapes complexes plus
` : `
- Exprime les durées en jours pour plus de précision (ex: "14 jours" au lieu de "2 semaines")
`}

Réponds UNIQUEMENT avec un JSON valide suivant ce format exact (sans markdown, sans commentaires) :
{
  "steps": [
    {
      "title": "Titre de l'étape",
      "description": "Description détaillée de l'étape",
      "estimatedDuration": "X jours"
    }
  ]
}

Génère entre 4 et 8 étapes selon la complexité du projet. Assure-toi que les étapes suivent un ordre logique et progressif.`

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    // Extraire le texte de la réponse
    const responseText = message.content[0].type === "text" ? message.content[0].text : ""

    // Parser le JSON de la réponse
    let stepsData
    try {
      stepsData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Erreur de parsing JSON:", responseText)
      return NextResponse.json(
        { error: "Erreur lors de l'analyse de la réponse de Claude" },
        { status: 500 }
      )
    }

    return NextResponse.json({ steps: stepsData.steps })
  } catch (error) {
    console.error("Erreur lors de la génération des étapes:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération des étapes" },
      { status: 500 }
    )
  }
}
