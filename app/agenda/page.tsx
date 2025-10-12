"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AgendaPage() {
  const router = useRouter()

  useEffect(() => {
    // Rediriger vers la page d'accueil - l'agenda est maintenant dans la navigation
    router.replace("/")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground font-light">Redirection...</p>
    </div>
  )
}
