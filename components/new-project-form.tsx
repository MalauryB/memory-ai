"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, Loader2 } from "lucide-react"

interface ProjectStep {
  id: string
  title: string
  description: string
  estimatedDuration: string
}

interface ProjectFormData {
  title: string
  description: string
  category: string
  deadline: string
  steps: ProjectStep[]
}

export function NewProjectForm({ onComplete }: { onComplete?: (data: ProjectFormData) => void }) {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  // Form data
  const [formData, setFormData] = useState<ProjectFormData>({
    title: "",
    description: "",
    category: "",
    deadline: "",
    steps: []
  })

  const [newStep, setNewStep] = useState<Omit<ProjectStep, "id">>({
    title: "",
    description: "",
    estimatedDuration: ""
  })

  const [isGenerating, setIsGenerating] = useState(false)

  const progressPercentage = (currentStep / totalSteps) * 100

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleAddStep = () => {
    if (newStep.title.trim()) {
      const step: ProjectStep = {
        id: Date.now().toString(),
        ...newStep
      }
      setFormData({
        ...formData,
        steps: [...formData.steps, step]
      })
      setNewStep({
        title: "",
        description: "",
        estimatedDuration: ""
      })
    }
  }

  const handleRemoveStep = (id: string) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter(step => step.id !== id)
    })
  }

  const handleGenerateSteps = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-steps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          deadline: formData.deadline,
        }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la génération")
      }

      const data = await response.json()

      // Convertir les étapes générées avec des IDs
      const generatedSteps: ProjectStep[] = data.steps.map((step: Omit<ProjectStep, "id">) => ({
        ...step,
        id: Date.now().toString() + Math.random(),
      }))

      setFormData({
        ...formData,
        steps: generatedSteps,
      })
    } catch (error) {
      console.error("Erreur:", error)
      alert("Erreur lors de la génération des étapes. Veuillez réessayer.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = () => {
    if (onComplete) {
      onComplete(formData)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim() !== ""
      case 2:
        return formData.description.trim() !== ""
      case 3:
        return formData.category.trim() !== "" && formData.deadline.trim() !== ""
      case 4:
        return formData.steps.length > 0
      default:
        return false
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Progress indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-light text-muted-foreground">
            Étape {currentStep} sur {totalSteps}
          </p>
          <p className="text-sm font-light text-muted-foreground">{Math.round(progressPercentage)}%</p>
        </div>
        <Progress value={progressPercentage} className="h-1" />
      </div>

      {/* Step content */}
      <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="space-y-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-light tracking-tight">Nommez votre projet</h2>
                <p className="text-muted-foreground font-light">
                  Donnez un titre clair et inspirant à votre projet de vie.
                </p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="title" className="font-light">
                  Titre du projet
                </Label>
                <Input
                  id="title"
                  placeholder="Ex: Devenir développeur web freelance"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-lg"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-light tracking-tight">Décrivez votre vision</h2>
                <p className="text-muted-foreground font-light">
                  Expliquez pourquoi ce projet est important pour vous et ce que vous souhaitez accomplir.
                </p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="description" className="font-light">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez votre projet, vos motivations et vos objectifs..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[200px] resize-none"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-light tracking-tight">Informations pratiques</h2>
                <p className="text-muted-foreground font-light">
                  Définissez la catégorie et l'échéance de votre projet.
                </p>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="category" className="font-light">
                    Catégorie
                  </Label>
                  <Input
                    id="category"
                    placeholder="Ex: Carrière, Santé, Personnel..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="deadline" className="font-light">
                    Date limite
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-light tracking-tight">Décomposez les étapes</h2>
                  <p className="text-muted-foreground font-light">
                    Laissez Claude analyser votre projet et générer les étapes, ou ajoutez-les manuellement.
                  </p>
                </div>
                <Button
                  onClick={handleGenerateSteps}
                  disabled={isGenerating}
                  className="w-full font-light"
                  variant="default"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Générer les étapes avec Claude
                    </>
                  )}
                </Button>
              </div>

              {/* Liste des étapes ajoutées */}
              {formData.steps.length > 0 && (
                <div className="space-y-3">
                  {formData.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-light text-muted-foreground">
                              Étape {index + 1}
                            </span>
                            {step.estimatedDuration && (
                              <span className="text-xs font-light text-muted-foreground">
                                • {step.estimatedDuration}
                              </span>
                            )}
                          </div>
                          <h4 className="font-light">{step.title}</h4>
                          {step.description && (
                            <p className="text-sm text-muted-foreground font-light">{step.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveStep(step.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulaire d'ajout d'étape */}
              <div className="space-y-4 p-4 rounded-lg border border-dashed border-border">
                <div className="space-y-3">
                  <Label htmlFor="step-title" className="font-light text-sm">
                    Titre de l'étape
                  </Label>
                  <Input
                    id="step-title"
                    placeholder="Ex: Apprendre les bases de JavaScript"
                    value={newStep.title}
                    onChange={(e) => setNewStep({ ...newStep, title: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="step-description" className="font-light text-sm">
                    Description (optionnel)
                  </Label>
                  <Textarea
                    id="step-description"
                    placeholder="Détails de cette étape..."
                    value={newStep.description}
                    onChange={(e) => setNewStep({ ...newStep, description: e.target.value })}
                    className="min-h-[80px] resize-none"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="step-duration" className="font-light text-sm">
                    Durée estimée (optionnel)
                  </Label>
                  <Input
                    id="step-duration"
                    placeholder="Ex: 2 semaines, 1 mois..."
                    value={newStep.estimatedDuration}
                    onChange={(e) => setNewStep({ ...newStep, estimatedDuration: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleAddStep}
                  disabled={!newStep.title.trim()}
                  className="w-full"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter cette étape
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="font-light"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Précédent
        </Button>

        {currentStep < totalSteps ? (
          <Button onClick={handleNext} disabled={!canProceed()} className="font-light">
            Suivant
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canProceed()} className="font-light">
            Créer le projet
          </Button>
        )}
      </div>
    </div>
  )
}
