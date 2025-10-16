"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, ChevronRight, X, Check, Calendar, FolderKanban, TrendingUp, Sparkles, MapPin, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface OnboardingFlowProps {
  onComplete: () => void
  onSkip: () => void
}

interface ProfileData {
  full_name: string
  location: string
  wake_up_time: string
  sleep_time: string
  work_hours_start: string
  work_hours_end: string
}

interface ProjectData {
  title: string
  category: string
  description: string
  deadline: string
}

const FEATURES = [
  {
    icon: Calendar,
    title: "Planning journalier intelligent",
    description: "Un planning personnalisé généré chaque jour selon vos disponibilités et priorités",
  },
  {
    icon: FolderKanban,
    title: "Gestion de projets",
    description: "Organisez vos objectifs en projets, étapes et sous-tâches pour avancer efficacement",
  },
  {
    icon: TrendingUp,
    title: "Suivi de progression",
    description: "Visualisez vos progrès avec des graphiques et des statistiques détaillées",
  },
  {
    icon: Sparkles,
    title: "Suggestions IA",
    description: "Recevez des recommandations personnalisées pour optimiser votre temps",
  },
]

const PROJECT_CATEGORIES = [
  { value: "health", label: "Santé & Bien-être", emoji: "💪" },
  { value: "learning", label: "Apprentissage", emoji: "📚" },
  { value: "work", label: "Carrière professionnelle", emoji: "💼" },
  { value: "creative", label: "Créativité & Loisirs", emoji: "🎨" },
  { value: "personal", label: "Développement personnel", emoji: "🌱" },
  { value: "home", label: "Maison & Organisation", emoji: "🏠" },
  { value: "finance", label: "Finance & Budget", emoji: "💰" },
  { value: "relationships", label: "Relations & Social", emoji: "❤️" },
]

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    location: "Paris",
    wake_up_time: "07:00",
    sleep_time: "23:00",
    work_hours_start: "09:00",
    work_hours_end: "18:00",
  })

  const [project, setProject] = useState<ProjectData>({
    title: "",
    category: "",
    description: "",
    deadline: "",
  })

  const handleProfileSave = async () => {
    if (!profile.full_name) {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner votre nom",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          wake_up_time: profile.wake_up_time + ":00",
          sleep_time: profile.sleep_time + ":00",
          work_hours_start: profile.work_hours_start + ":00",
          work_hours_end: profile.work_hours_end + ":00",
          onboarding_completed: false, // Pas encore terminé
          bio: "",
          avatar_url: "",
          timezone: "Europe/Paris",
        }),
      })

      if (response.ok) {
        setStep(2) // Passer à l'étape suivante
      } else {
        throw new Error("Erreur lors de la sauvegarde")
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde du profil",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleProjectSave = async () => {
    if (!project.title || !project.category) {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner au moins un titre et une catégorie",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...project,
          status: "active",
        }),
      })

      if (response.ok) {
        await handleComplete()
      } else {
        throw new Error("Erreur lors de la création")
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la création du projet",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      // Marquer l'onboarding comme complété
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          wake_up_time: profile.wake_up_time + ":00",
          sleep_time: profile.sleep_time + ":00",
          work_hours_start: profile.work_hours_start + ":00",
          work_hours_end: profile.work_hours_end + ":00",
          onboarding_completed: true,
          bio: "",
          avatar_url: "",
          timezone: "Europe/Paris",
        }),
      })

      onComplete()
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setSaving(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        // Bienvenue
        return (
          <div className="space-y-8 text-center">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 text-accent">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="text-3xl font-light tracking-tight">Bienvenue sur Memo'ry Planner</h2>
              <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
                Votre assistant intelligent pour organiser vos projets et optimiser votre temps
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {FEATURES.map((feature) => (
                <Card key={feature.title} className="p-4 border-border/50 bg-card/50 backdrop-blur-sm">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground font-light">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Button onClick={() => setStep(1)} size="lg" className="font-light">
              Commencer
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )

      case 1:
        // Configuration profil
        return (
          <div className="space-y-8">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-light tracking-tight">Créons votre profil</h2>
              <p className="text-muted-foreground font-light">
                Quelques informations pour personnaliser votre expérience
              </p>
            </div>

            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="font-light">
                    Comment souhaitez-vous qu'on vous appelle ? *
                  </Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Votre prénom ou nom"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="font-light flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Où habitez-vous ?
                  </Label>
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    placeholder="Ville"
                  />
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-light">Vos horaires typiques</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wake_up_time" className="text-sm font-light">
                        Lever
                      </Label>
                      <Input
                        id="wake_up_time"
                        type="time"
                        value={profile.wake_up_time}
                        onChange={(e) => setProfile({ ...profile, wake_up_time: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sleep_time" className="text-sm font-light">
                        Coucher
                      </Label>
                      <Input
                        id="sleep_time"
                        type="time"
                        value={profile.sleep_time}
                        onChange={(e) => setProfile({ ...profile, sleep_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="work_hours_start" className="text-sm font-light">
                        Début travail
                      </Label>
                      <Input
                        id="work_hours_start"
                        type="time"
                        value={profile.work_hours_start}
                        onChange={(e) => setProfile({ ...profile, work_hours_start: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="work_hours_end" className="text-sm font-light">
                        Fin travail
                      </Label>
                      <Input
                        id="work_hours_end"
                        type="time"
                        value={profile.work_hours_end}
                        onChange={(e) => setProfile({ ...profile, work_hours_end: e.target.value })}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground font-light">
                    Ces horaires nous aident à planifier vos tâches aux meilleurs moments
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setStep(0)} variant="ghost" className="font-light">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Retour
                </Button>
                <Button onClick={handleProfileSave} disabled={saving} className="font-light flex-1">
                  {saving ? "Sauvegarde..." : "Continuer"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        )

      case 2:
        // Création premier projet
        return (
          <div className="space-y-8">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-light tracking-tight">Créez votre premier projet</h2>
              <p className="text-muted-foreground font-light">
                Un projet est un objectif que vous souhaitez atteindre (optionnel, vous pouvez le faire plus tard)
              </p>
            </div>

            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project_title" className="font-light">
                    Quel est votre objectif ?
                  </Label>
                  <Input
                    id="project_title"
                    value={project.title}
                    onChange={(e) => setProject({ ...project, title: e.target.value })}
                    placeholder="Ex: Apprendre le piano, Courir un marathon, Rénover ma cuisine..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_category" className="font-light">
                    Catégorie
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {PROJECT_CATEGORIES.map((cat) => (
                      <Button
                        key={cat.value}
                        type="button"
                        variant={project.category === cat.value ? "default" : "outline"}
                        className="justify-start font-light h-auto py-3"
                        onClick={() => setProject({ ...project, category: cat.value })}
                      >
                        <span className="mr-2">{cat.emoji}</span>
                        <span className="text-xs">{cat.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_description" className="font-light">
                    Description (optionnel)
                  </Label>
                  <Textarea
                    id="project_description"
                    value={project.description}
                    onChange={(e) => setProject({ ...project, description: e.target.value })}
                    placeholder="Pourquoi est-ce important pour vous ?"
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_deadline" className="font-light">
                    Date limite (optionnel)
                  </Label>
                  <Input
                    id="project_deadline"
                    type="date"
                    value={project.deadline}
                    onChange={(e) => setProject({ ...project, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleComplete} variant="ghost" className="font-light" disabled={saving}>
                  Passer
                </Button>
                <Button onClick={handleProjectSave} disabled={saving} className="font-light flex-1">
                  {saving ? "Création..." : "Créer mon projet"}
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header avec bouton skip */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground font-light">
              Étape {step + 1} sur 3
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onSkip} className="font-light">
            <X className="h-4 w-4 mr-2" />
            Quitter
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="w-full h-1 bg-border/50">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${((step + 1) / 3) * 100}%` }}
        />
      </div>

      {/* Contenu */}
      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        {renderStep()}
      </main>
    </div>
  )
}
