"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  ArrowLeft,
  GripVertical,
  Trash2,
  Pencil,
  Check,
  X,
  Plus,
  Loader2,
  Save,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from "lucide-react"
import { getUser } from "@/lib/auth"

interface ProjectStep {
  id: string
  title: string
  description: string
  estimated_duration: string
  status: string
  order_index: number
}

interface Project {
  id: string
  title: string
  description: string
  category: string
  start_date: string | null
  deadline: string | null
  image_url: string | null
  project_steps: ProjectStep[]
}

export default function EditProjectPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editingStepData, setEditingStepData] = useState({
    title: "",
    description: "",
    estimated_duration: "",
  })

  useEffect(() => {
    checkUserAndFetchProject()
  }, [projectId])

  async function checkUserAndFetchProject() {
    const user = await getUser()
    if (!user) {
      router.push("/auth")
      return
    }
    await fetchProject()
  }

  async function fetchProject() {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setLoading(false)
    }
  }

  const moveStep = (index: number, direction: "up" | "down") => {
    if (!project) return

    const newSteps = [...project.project_steps]
    const targetIndex = direction === "up" ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newSteps.length) return

    // Échanger les étapes
    ;[newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]]

    // Mettre à jour les order_index
    newSteps.forEach((step, idx) => {
      step.order_index = idx
    })

    setProject({ ...project, project_steps: newSteps })
  }

  const deleteStep = (stepId: string) => {
    if (!project) return
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette étape ?")) return

    const newSteps = project.project_steps
      .filter((s) => s.id !== stepId)
      .map((step, idx) => ({ ...step, order_index: idx }))

    setProject({ ...project, project_steps: newSteps })
  }

  const startEditStep = (step: ProjectStep) => {
    setEditingStepId(step.id)
    setEditingStepData({
      title: step.title,
      description: step.description,
      estimated_duration: step.estimated_duration,
    })
  }

  const saveEditStep = () => {
    if (!project || !editingStepId) return

    const newSteps = project.project_steps.map((step) =>
      step.id === editingStepId ? { ...step, ...editingStepData } : step
    )

    setProject({ ...project, project_steps: newSteps })
    setEditingStepId(null)
    setEditingStepData({ title: "", description: "", estimated_duration: "" })
  }

  const cancelEditStep = () => {
    setEditingStepId(null)
    setEditingStepData({ title: "", description: "", estimated_duration: "" })
  }

  const addNewStep = () => {
    if (!project) return

    const newStep: ProjectStep = {
      id: `temp-${Date.now()}`,
      title: "Nouvelle étape",
      description: "",
      estimated_duration: "",
      status: "pending",
      order_index: project.project_steps.length,
    }

    setProject({ ...project, project_steps: [...project.project_steps, newStep] })
    startEditStep(newStep)
  }

  const generateSteps = async () => {
    if (!project) return

    setGenerating(true)
    try {
      const response = await fetch("/api/generate-steps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: project.title,
          description: project.description,
          category: project.category,
          startDate: project.start_date,
          deadline: project.deadline,
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la génération")
      }

      const data = await response.json()

      // Ajouter les nouvelles étapes générées aux étapes existantes
      const generatedSteps: ProjectStep[] = data.steps.map((step: any, index: number) => ({
        id: `temp-${Date.now()}-${index}`,
        title: step.title,
        description: step.description || "",
        estimated_duration: step.estimatedDuration || "",
        status: "pending",
        order_index: project.project_steps.length + index,
      }))

      setProject({
        ...project,
        project_steps: [...project.project_steps, ...generatedSteps],
      })
    } catch (error) {
      console.error("Erreur:", error)
      alert("Erreur lors de la génération des étapes. Veuillez réessayer.")
    } finally {
      setGenerating(false)
    }
  }

  const saveProject = async () => {
    if (!project) return

    setSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: project.title,
          description: project.description,
          category: project.category,
          startDate: project.start_date,
          deadline: project.deadline,
          steps: project.project_steps,
        }),
      })

      if (response.ok) {
        router.push(`/projet/${projectId}`)
      } else {
        alert("Erreur lors de la sauvegarde")
      }
    } catch (error) {
      console.error("Erreur:", error)
      alert("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-light">Projet introuvable</h2>
          <Button onClick={() => router.push("/")} variant="outline">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <Button variant="ghost" className="font-light" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={saveProject} disabled={saving} className="font-light">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-light tracking-tight">Modifier le projet</h1>
            <p className="text-muted-foreground font-light">
              Modifiez les informations et réorganisez les étapes de votre projet.
            </p>
          </div>

          {/* Informations du projet */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
            <h3 className="text-xl font-light">Informations générales</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-light">
                  Titre
                </Label>
                <Input
                  id="title"
                  value={project.title}
                  onChange={(e) => setProject({ ...project, title: e.target.value })}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-light">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={project.description}
                  onChange={(e) => setProject({ ...project, description: e.target.value })}
                  className="min-h-[120px] resize-none"
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="font-light">
                    Catégorie
                  </Label>
                  <Input
                    id="category"
                    value={project.category}
                    onChange={(e) => setProject({ ...project, category: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date" className="font-light">
                      Date de début
                    </Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={project.start_date || ""}
                      onChange={(e) => setProject({ ...project, start_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline" className="font-light">
                      Date de fin / Deadline
                    </Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={project.deadline || ""}
                      onChange={(e) => setProject({ ...project, deadline: e.target.value })}
                      min={project.start_date || undefined}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Gestion des étapes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-light">Étapes du projet</h3>
              <div className="flex items-center gap-2">
                <Button onClick={generateSteps} disabled={generating} variant="outline" size="sm" className="font-light">
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Générer avec IA
                    </>
                  )}
                </Button>
                <Button onClick={addNewStep} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter manuellement
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {project.project_steps.map((step, index) => (
                <Card
                  key={step.id}
                  className="p-4 border-border/50 bg-card/50 backdrop-blur-sm"
                >
                  {editingStepId === step.id ? (
                    // Mode édition
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-light text-muted-foreground">
                          Étape {index + 1} - Édition
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-green-600"
                            onClick={saveEditStep}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={cancelEditStep}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Input
                        placeholder="Titre de l'étape"
                        value={editingStepData.title}
                        onChange={(e) =>
                          setEditingStepData({ ...editingStepData, title: e.target.value })
                        }
                      />
                      <Textarea
                        placeholder="Description (optionnel)"
                        value={editingStepData.description}
                        onChange={(e) =>
                          setEditingStepData({ ...editingStepData, description: e.target.value })
                        }
                        className="min-h-[60px] resize-none text-sm"
                      />
                      <Input
                        placeholder="Durée estimée (optionnel)"
                        value={editingStepData.estimated_duration}
                        onChange={(e) =>
                          setEditingStepData({
                            ...editingStepData,
                            estimated_duration: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    // Mode lecture
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1 pt-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveStep(index, "up")}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveStep(index, "down")}
                          disabled={index === project.project_steps.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-light text-muted-foreground">
                            Étape {index + 1}
                          </span>
                          {step.estimated_duration && (
                            <span className="text-xs font-light text-muted-foreground">
                              • {step.estimated_duration}
                            </span>
                          )}
                        </div>
                        <h4 className="font-light">{step.title}</h4>
                        {step.description && (
                          <p className="text-sm text-muted-foreground font-light">
                            {step.description}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => startEditStep(step)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-destructive"
                          onClick={() => deleteStep(step.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}

              {project.project_steps.length === 0 && (
                <div className="text-center py-12 text-muted-foreground font-light">
                  <p>Aucune étape. Ajoutez-en une pour commencer.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
