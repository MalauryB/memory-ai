"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, Loader2, Pencil, Check, X, Image as ImageIcon, Upload } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { UpgradeModal } from "@/components/upgrade-modal"

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
  startDate: string
  deadline: string
  imageUrl: string
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
    startDate: "",
    deadline: "",
    imageUrl: "",
    steps: []
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const [newStep, setNewStep] = useState<Omit<ProjectStep, "id">>({
    title: "",
    description: "",
    estimatedDuration: ""
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editingStepData, setEditingStepData] = useState<Omit<ProjectStep, "id">>({
    title: "",
    description: "",
    estimatedDuration: ""
  })

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

  const handleStartEdit = (step: ProjectStep) => {
    setEditingStepId(step.id)
    setEditingStepData({
      title: step.title,
      description: step.description,
      estimatedDuration: step.estimatedDuration
    })
  }

  const handleSaveEdit = () => {
    if (editingStepId && editingStepData.title.trim()) {
      setFormData({
        ...formData,
        steps: formData.steps.map(step =>
          step.id === editingStepId
            ? { ...step, ...editingStepData }
            : step
        )
      })
      setEditingStepId(null)
      setEditingStepData({ title: "", description: "", estimatedDuration: "" })
    }
  }

  const handleCancelEdit = () => {
    setEditingStepId(null)
    setEditingStepData({ title: "", description: "", estimatedDuration: "" })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image')
        return
      }
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('L\'image ne doit pas dépasser 5 MB')
        return
      }

      setImageFile(file)

      // Créer une preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview("")
    setFormData({ ...formData, imageUrl: "" })
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null

    setIsUploadingImage(true)
    try {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError, data } = await supabase.storage
        .from('project-images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Erreur upload:', uploadError)
        return null
      }

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      return null
    } finally {
      setIsUploadingImage(false)
    }
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
          startDate: formData.startDate,
          deadline: formData.deadline,
        }),
      })

      if (response.status === 403) {
        // Limite de génération IA atteinte
        const data = await response.json()
        if (data.limit_reached) {
          setShowUpgradeModal(true)
          return
        }
      }

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

  const handleUpgrade = async () => {
    try {
      const response = await fetch('/api/account/upgrade', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        setShowUpgradeModal(false)
        alert('Félicitations ! Vous êtes maintenant Premium ✨')
      }
    } catch (error) {
      console.error('Error upgrading:', error)
    }
  }

  const handleSubmit = async () => {
    if (onComplete) {
      // Upload l'image si elle existe
      let imageUrl = formData.imageUrl
      if (imageFile) {
        const uploadedUrl = await uploadImage()
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        }
      }

      onComplete({
        ...formData,
        imageUrl
      })
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim() !== ""
      case 2:
        return formData.description.trim() !== ""
      case 3:
        return formData.category.trim() !== "" // Date limite optionnelle
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
          <p className="text-sm font-medium text-muted-foreground">
            Étape {currentStep} sur {totalSteps}
          </p>
          <p className="text-sm font-medium text-muted-foreground">{Math.round(progressPercentage)}%</p>
        </div>
        <Progress value={progressPercentage} className="h-1" />
      </div>

      {/* Step content */}
      <Card className="p-8 border-border bg-card/50 backdrop-blur-sm">
        <div className="space-y-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight">Nommez votre projet</h2>
                <p className="text-muted-foreground font-normal">
                  Donnez un titre clair et inspirant à votre projet de vie.
                </p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="title" className="font-normal">
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

              {/* Upload d'image */}
              <div className="space-y-3">
                <Label className="font-normal">
                  Image du projet <span className="text-muted-foreground text-sm">(optionnel)</span>
                </Label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Aperçu"
                      className="w-full h-48 object-cover rounded-lg border border-border"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Retirer
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent/50 transition-colors bg-background/50"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="mb-2 text-sm font-medium text-muted-foreground">
                        <span className="font-normal">Cliquez pour ajouter</span> ou glissez une image
                      </p>
                      <p className="text-xs text-muted-foreground font-normal">
                        PNG, JPG, GIF jusqu'à 5MB
                      </p>
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight">Décrivez votre vision</h2>
                <p className="text-muted-foreground font-normal">
                  Plus votre description sera détaillée, plus Claude pourra générer des étapes pertinentes.
                </p>
              </div>

              {/* Questions guides */}
              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 space-y-3">
                <p className="text-sm font-medium text-accent">💡 Pour vous guider :</p>
                <ul className="space-y-2 text-sm font-normal text-muted-foreground">
                  <li>• Pourquoi ce projet est-il important pour vous ?</li>
                  <li>• Qu'est-ce que vous souhaitez accomplir concrètement ?</li>
                  <li>• Quel sera le résultat final que vous visez ?</li>
                  <li>• Quelles compétences ou ressources pensez-vous nécessaires ?</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Label htmlFor="description" className="font-normal">
                  Description détaillée
                </Label>
                <Textarea
                  id="description"
                  placeholder="Exemple : Je souhaite devenir développeur web freelance pour avoir plus de liberté et travailler sur des projets variés. Mon objectif est de pouvoir décrocher mes premiers clients dans 6 mois. J'ai déjà des bases en HTML/CSS mais je dois apprendre JavaScript, React, et comment créer un portfolio professionnel..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[200px] resize-none"
                />
                <p className="text-xs text-muted-foreground font-normal">
                  {formData.description.length} caractères
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight">Informations pratiques</h2>
                <p className="text-muted-foreground font-normal">
                  Catégorisez votre projet et définissez une échéance si vous le souhaitez.
                </p>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="category" className="font-normal">
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
                  <Label htmlFor="startDate" className="font-normal">
                    Date de début <span className="text-muted-foreground text-sm">(optionnel)</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="deadline" className="font-normal">
                    Date de fin / Deadline <span className="text-muted-foreground text-sm">(optionnel)</span>
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    min={formData.startDate || undefined}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold tracking-tight">Décomposez les étapes</h2>
                  <p className="text-muted-foreground font-normal">
                    Laissez Claude analyser votre projet et générer les étapes, ou ajoutez-les manuellement.
                  </p>
                </div>
                <Button
                  onClick={handleGenerateSteps}
                  disabled={isGenerating}
                  className="w-full font-normal"
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
                      className="p-4 rounded-lg border border-border bg-background/50 space-y-3"
                    >
                      {editingStepId === step.id ? (
                        // Mode édition
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              Étape {index + 1} - Édition
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={handleSaveEdit}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <Input
                            placeholder="Titre de l'étape"
                            value={editingStepData.title}
                            onChange={(e) => setEditingStepData({ ...editingStepData, title: e.target.value })}
                            className="font-medium"
                          />
                          <Textarea
                            placeholder="Description (optionnel)"
                            value={editingStepData.description}
                            onChange={(e) => setEditingStepData({ ...editingStepData, description: e.target.value })}
                            className="min-h-[60px] resize-none text-sm"
                          />
                          <Input
                            placeholder="Durée estimée (optionnel)"
                            value={editingStepData.estimatedDuration}
                            onChange={(e) => setEditingStepData({ ...editingStepData, estimatedDuration: e.target.value })}
                            className="text-sm"
                          />
                        </div>
                      ) : (
                        // Mode lecture
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">
                                Étape {index + 1}
                              </span>
                              {step.estimatedDuration && (
                                <span className="text-xs font-medium text-muted-foreground">
                                  • {step.estimatedDuration}
                                </span>
                              )}
                            </div>
                            <h4 className="font-normal">{step.title}</h4>
                            {step.description && (
                              <p className="text-sm text-muted-foreground font-normal">{step.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-muted-foreground hover:text-accent"
                              onClick={() => handleStartEdit(step)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
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
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Formulaire d'ajout d'étape */}
              <div className="space-y-4 p-4 rounded-lg border border-dashed border-border">
                <div className="space-y-3">
                  <Label htmlFor="step-title" className="font-medium text-sm">
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
                  <Label htmlFor="step-description" className="font-medium text-sm">
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
                  <Label htmlFor="step-duration" className="font-medium text-sm">
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
          className="font-medium"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Précédent
        </Button>

        {currentStep < totalSteps ? (
          <Button onClick={handleNext} disabled={!canProceed()} className="font-normal">
            Suivant
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canProceed() || isUploadingImage} className="font-normal">
            {isUploadingImage ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Upload en cours...
              </>
            ) : (
              "Créer le projet"
            )}
          </Button>
        )}
      </div>

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  )
}
