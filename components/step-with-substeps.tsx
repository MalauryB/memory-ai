"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  CheckCircle2,
  Circle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Calendar as CalendarIcon,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { UpgradeModal } from "@/components/upgrade-modal"

interface ProjectSubstep {
  id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "skipped"
  estimated_duration: string
  scheduled_date: string | null
  is_recurring: boolean
  recurrence_type: string
  order_index: number
}

interface ProjectStep {
  id: string
  title: string
  description: string
  estimated_duration: string
  status: "pending" | "in_progress" | "completed"
  order_index: number
}

interface Props {
  step: ProjectStep
  stepIndex: number
  projectId: string
  projectTitle: string
  projectCategory: string
  onStepStatusChange: () => void
}

export function StepWithSubsteps({
  step,
  stepIndex,
  projectId,
  projectTitle,
  projectCategory,
  onStepStatusChange,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [substeps, setSubsteps] = useState<ProjectSubstep[]>([])
  const [loadingSubsteps, setLoadingSubsteps] = useState(false)
  const [generatingSubsteps, setGeneratingSubsteps] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [updatingSubstep, setUpdatingSubstep] = useState<string | null>(null)
  const [updatingStep, setUpdatingStep] = useState(false)
  const [editingSubstep, setEditingSubstep] = useState<ProjectSubstep | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    estimated_duration: "",
    scheduled_date: "",
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingSubstep, setDeletingSubstep] = useState<string | null>(null)
  const [hasBeenDecomposed, setHasBeenDecomposed] = useState(false)

  useEffect(() => {
    if (isExpanded && substeps.length === 0 && !hasBeenDecomposed) {
      fetchSubsteps()
    }
  }, [isExpanded])

  async function fetchSubsteps() {
    setLoadingSubsteps(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/steps/${step.id}/substeps`)
      if (response.ok) {
        const data = await response.json()
        setSubsteps(data.substeps)
        // Marquer comme décomposé dès qu'on a chargé les substeps (même si vide)
        setHasBeenDecomposed(true)
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setLoadingSubsteps(false)
    }
  }

  async function generateSubsteps() {
    setGeneratingSubsteps(true)
    try {
      // Générer les sous-étapes avec Claude
      const genResponse = await fetch("/api/generate-substeps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stepTitle: step.title,
          stepDescription: step.description,
          projectTitle,
          projectCategory,
        }),
      })

      if (genResponse.status === 403) {
        // Limite de génération IA atteinte
        const data = await genResponse.json()
        if (data.limit_reached) {
          setShowUpgradeModal(true)
          return
        }
      }

      if (genResponse.ok) {
        const { substeps: generatedSubsteps } = await genResponse.json()

        // Créer les sous-étapes
        const createResponse = await fetch(`/api/projects/${projectId}/steps/${step.id}/substeps`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            substeps: generatedSubsteps,
          }),
        })

        if (createResponse.ok) {
          await fetchSubsteps()
          setHasBeenDecomposed(true)
        }
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setGeneratingSubsteps(false)
    }
  }

  async function handleUpgrade() {
    try {
      const response = await fetch('/api/account/upgrade', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        setShowUpgradeModal(false)
        alert('Félicitations ! Vous êtes maintenant Premium ✨')
        // Recharger la page pour mettre à jour l'interface
        window.location.reload()
      } else {
        alert(data.message || 'Erreur lors de l\'upgrade')
      }
    } catch (error) {
      console.error('Error upgrading:', error)
      alert('Erreur lors de l\'upgrade. Veuillez réessayer.')
    }
  }

  async function updateStepStatus(newStatus: "pending" | "in_progress" | "completed") {
    setUpdatingStep(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/steps/${step.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        onStepStatusChange()
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setUpdatingStep(false)
    }
  }

  async function updateSubstepStatus(
    substepId: string,
    newStatus: "pending" | "in_progress" | "completed"
  ) {
    setUpdatingSubstep(substepId)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/steps/${step.id}/substeps/${substepId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      )

      if (response.ok) {
        await fetchSubsteps()
        onStepStatusChange()
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setUpdatingSubstep(null)
    }
  }

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "pending":
        return "in_progress"
      case "in_progress":
        return "completed"
      case "completed":
        return "pending"
      default:
        return "pending"
    }
  }

  function openEditDialog(substep: ProjectSubstep) {
    setEditingSubstep(substep)
    setEditForm({
      title: substep.title,
      description: substep.description || "",
      estimated_duration: substep.estimated_duration || "",
      scheduled_date: substep.scheduled_date || "",
    })
    setIsEditDialogOpen(true)
  }

  async function saveSubstepEdit() {
    if (!editingSubstep) return

    setSavingEdit(true)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/steps/${step.id}/substeps/${editingSubstep.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editForm.title,
            description: editForm.description,
            estimated_duration: editForm.estimated_duration,
            scheduled_date: editForm.scheduled_date || null,
          }),
        }
      )

      if (response.ok) {
        await fetchSubsteps()
        setIsEditDialogOpen(false)
        setEditingSubstep(null)
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setSavingEdit(false)
    }
  }

  async function deleteSubstep(substepId: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette sous-étape ?")) return

    setDeletingSubstep(substepId)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/steps/${step.id}/substeps/${substepId}`,
        {
          method: "DELETE",
        }
      )

      if (response.ok) {
        await fetchSubsteps()
        onStepStatusChange()
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setDeletingSubstep(null)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    })
  }

  const completedSubsteps = substeps.filter((s) => s.status === "completed").length
  const totalSubsteps = substeps.length

  return (
    <>
    <Card
      className={`border-border/50 backdrop-blur-sm transition-all ${
        step.status === "completed"
          ? "bg-accent/5 border-accent/20"
          : step.status === "in_progress"
          ? "bg-card/50 border-accent/50"
          : "bg-card/50"
      }`}
    >
      {/* En-tête de l'étape */}
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">
            {updatingStep ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : step.status === "completed" ? (
              <CheckCircle2 className="h-6 w-6 text-accent" />
            ) : step.status === "in_progress" ? (
              <Circle className="h-6 w-6 text-accent fill-accent/20" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div
                className="space-y-1 flex-1 cursor-pointer"
                onClick={() => updateStepStatus(getNextStatus(step.status) as any)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-light">
                    Étape {stepIndex + 1}
                  </span>
                  {step.estimated_duration && (
                    <span className="text-xs text-muted-foreground font-light">
                      • {step.estimated_duration}
                    </span>
                  )}
                  {totalSubsteps > 0 && (
                    <span className="text-xs text-muted-foreground font-light">
                      • {completedSubsteps}/{totalSubsteps} sous-étapes
                    </span>
                  )}
                </div>
                <h4
                  className={`font-light text-lg ${
                    step.status === "completed" ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {step.title}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-light whitespace-nowrap ${
                    step.status === "completed"
                      ? "bg-accent/20 text-accent"
                      : step.status === "in_progress"
                      ? "bg-blue-500/20 text-blue-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.status === "completed"
                    ? "Terminé"
                    : step.status === "in_progress"
                    ? "En cours"
                    : "À faire"}
                </span>

                {!loadingSubsteps && !hasBeenDecomposed && !generatingSubsteps && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      generateSubsteps()
                    }}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Décomposer
                  </Button>
                )}

                {generatingSubsteps && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Génération...</span>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded(!isExpanded)
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {step.description && (
              <p
                className={`text-sm font-light cursor-pointer ${
                  step.status === "completed" ? "text-muted-foreground" : "text-muted-foreground"
                }`}
                onClick={() => updateStepStatus(getNextStatus(step.status) as any)}
              >
                {step.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section des sous-étapes */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-border/30">
          {loadingSubsteps ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : substeps.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm text-muted-foreground font-light">
                Aucune sous-étape définie pour cette étape
              </p>
              <Button
                onClick={generateSubsteps}
                disabled={generatingSubsteps}
                size="sm"
                variant="outline"
              >
                {generatingSubsteps ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Générer avec l'IA
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-2 mt-4">
              {substeps
                .sort((a, b) => a.order_index - b.order_index)
                .map((substep) => (
                  <div
                    key={substep.id}
                    className={`p-3 rounded-lg border transition-all ${
                      substep.status === "completed"
                        ? "bg-accent/5 border-accent/20"
                        : substep.status === "in_progress"
                        ? "bg-blue-500/5 border-blue-500/20"
                        : "bg-background/50 border-border/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex-shrink-0 mt-0.5 cursor-pointer"
                        onClick={() => updateSubstepStatus(substep.id, getNextStatus(substep.status) as any)}
                      >
                        {updatingSubstep === substep.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : substep.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-accent" />
                        ) : substep.status === "in_progress" ? (
                          <Circle className="h-4 w-4 text-blue-500 fill-blue-500/20" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      <div
                        className="flex-1 space-y-1 cursor-pointer"
                        onClick={() => updateSubstepStatus(substep.id, getNextStatus(substep.status) as any)}
                      >
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-light ${
                              substep.status === "completed"
                                ? "text-muted-foreground line-through"
                                : ""
                            }`}
                          >
                            {substep.title}
                          </p>
                          {substep.scheduled_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CalendarIcon className="h-3 w-3" />
                              <span>{formatDate(substep.scheduled_date)}</span>
                            </div>
                          )}
                        </div>
                        {substep.description && (
                          <p className="text-xs text-muted-foreground font-light">
                            {substep.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {substep.estimated_duration && (
                          <span className="text-xs text-muted-foreground font-light whitespace-nowrap mr-2">
                            {substep.estimated_duration}
                          </span>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-60 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditDialog(substep)
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-60 hover:opacity-100 hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteSubstep(substep.id)
                          }}
                          disabled={deletingSubstep === substep.id}
                        >
                          {deletingSubstep === substep.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogue d'édition de sous-étape */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier la sous-étape</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la sous-étape
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Titre de la sous-étape"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Description (optionnel)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Durée estimée</Label>
                <Input
                  id="duration"
                  value={editForm.estimated_duration}
                  onChange={(e) =>
                    setEditForm({ ...editForm, estimated_duration: e.target.value })
                  }
                  placeholder="ex: 2h, 30min"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date prévue</Label>
                <Input
                  id="date"
                  type="date"
                  value={editForm.scheduled_date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, scheduled_date: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={savingEdit}
            >
              Annuler
            </Button>
            <Button onClick={saveSubstepEdit} disabled={savingEdit || !editForm.title.trim()}>
              {savingEdit ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>

    <UpgradeModal
      open={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      onUpgrade={handleUpgrade}
    />
  </>
  )
}
