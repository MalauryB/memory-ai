"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { OnboardingFlow } from "@/components/onboarding-flow"
import { useAuth } from "@/hooks/use-auth"
import { Loader2 } from "lucide-react"

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()

  // Rediriger si non authentifié
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth")
    }
  }, [isLoading, isAuthenticated, router])

  const handleComplete = () => {
    // Rediriger vers la page principale après complétion
    router.push("/")
  }

  const handleSkip = async () => {
    // Marquer l'onboarding comme complété même si skip
    try {
      const profileResponse = await fetch("/api/profile")

      if (profileResponse.ok) {
        // Profil existe déjà, on le met à jour
        const { profile } = await profileResponse.json()

        await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...profile,
            onboarding_completed: true,
          }),
        })
      } else {
        // Pas de profil existant, on en crée un minimal
        await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: user?.email?.split('@')[0] || "Utilisateur",
            onboarding_completed: true,
            wake_up_time: "07:00:00",
            sleep_time: "23:00:00",
            work_hours_start: "09:00:00",
            work_hours_end: "18:00:00",
            timezone: "Europe/Paris",
          }),
        })
      }
    } catch (error) {
      console.error("Erreur lors du skip:", error)
    }

    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <OnboardingFlow onComplete={handleComplete} onSkip={handleSkip} />
}
