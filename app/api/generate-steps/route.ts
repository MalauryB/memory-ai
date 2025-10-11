import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Mode mock pour tester sans appeler l'API
const USE_MOCK = process.env.USE_MOCK_AI === "true"

export async function POST(request: NextRequest) {
  try {
    const { title, description, category, deadline } = await request.json()

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

    const prompt = `Tu es un assistant expert en planification de projets et en décomposition d'objectifs.

Un utilisateur souhaite atteindre le projet suivant :

Titre : ${title}
Catégorie : ${category || "Non spécifiée"}
Date limite : ${deadline || "Non spécifiée"}
Description : ${description}

Ta tâche est de décomposer ce projet en étapes concrètes, actionnables et réalistes. Pour chaque étape, fournis :
1. Un titre clair et concis
2. Une description détaillée de ce qu'il faut faire
3. Une estimation de durée réaliste

Réponds UNIQUEMENT avec un JSON valide suivant ce format exact (sans markdown, sans commentaires) :
{
  "steps": [
    {
      "title": "Titre de l'étape",
      "description": "Description détaillée de l'étape",
      "estimatedDuration": "Durée estimée"
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
