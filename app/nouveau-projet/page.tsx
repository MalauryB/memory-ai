"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { NewProjectForm } from "@/components/new-project-form"
import { getUser } from "@/lib/auth"

export default function NewProjectPage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const user = await getUser()
    if (!user) {
      router.push("/auth")
    } else {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground font-light">Chargement...</p>
      </div>
    )
  }

  const handleComplete = async (data: any) => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la sauvegarde")
      }

      const result = await response.json()
      console.log("Projet créé avec succès:", result)

      // Rediriger vers la page d'accueil
      router.push("/")
    } catch (error) {
      console.error("Erreur:", error)
      alert("Erreur lors de la création du projet. Veuillez réessayer.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-6 py-6">
          <Button
            variant="ghost"
            className="font-light"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="space-y-12">
          <div className="space-y-3 max-w-2xl mx-auto">
            <h1 className="text-4xl font-light tracking-tight text-balance">
              Créer un nouveau projet
            </h1>
            <p className="text-lg text-muted-foreground font-light">
              Transformez votre vision en réalité en décomposant votre projet en étapes actionnables.
            </p>
          </div>

          <NewProjectForm onComplete={handleComplete} />
        </div>
      </main>
    </div>
  )
}
