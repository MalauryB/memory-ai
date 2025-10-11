"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"

interface CreateTrackerDialogProps {
  projectId: string
  stepId?: string | null
  onTrackerCreated?: () => void
}

export function CreateTrackerDialog({ projectId, stepId, onTrackerCreated }: CreateTrackerDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // État du formulaire
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [recurrenceType, setRecurrenceType] = useState<string>("daily")
  const [recurrenceValue, setRecurrenceValue] = useState(1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/trackers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          step_id: stepId,
          title,
          description,
          recurrence_type: recurrenceType,
          recurrence_value: recurrenceValue,
        }),
      })

      if (response.ok) {
        // Réinitialiser le formulaire
        setTitle("")
        setDescription("")
        setRecurrenceType("daily")
        setRecurrenceValue(1)
        setOpen(false)

        // Notifier le parent
        if (onTrackerCreated) {
          onTrackerCreated()
        }
      } else {
        console.error("Erreur lors de la création du tracker")
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-light">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un tracker
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-light text-2xl">Créer un tracker</DialogTitle>
            <DialogDescription className="font-light">
              Créez une nouvelle habitude à suivre quotidiennement pour ce projet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Titre */}
            <div className="space-y-2">
              <Label htmlFor="title" className="font-light">
                Titre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: M'hydrater : boire 2L d'eau"
                required
                className="font-light"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="font-light">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de l'habitude (optionnel)"
                rows={3}
                className="font-light resize-none"
              />
            </div>

            {/* Fréquence */}
            <div className="space-y-2">
              <Label htmlFor="recurrence" className="font-light">
                Fréquence <span className="text-destructive">*</span>
              </Label>
              <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                <SelectTrigger className="font-light">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily" className="font-light">
                    Tous les jours
                  </SelectItem>
                  <SelectItem value="every_x_days" className="font-light">
                    Tous les X jours
                  </SelectItem>
                  <SelectItem value="weekly" className="font-light">
                    Hebdomadaire
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valeur de récurrence (si every_x_days) */}
            {recurrenceType === "every_x_days" && (
              <div className="space-y-2">
                <Label htmlFor="recurrence_value" className="font-light">
                  Tous les combien de jours ?
                </Label>
                <Input
                  id="recurrence_value"
                  type="number"
                  min="1"
                  max="30"
                  value={recurrenceValue}
                  onChange={(e) => setRecurrenceValue(parseInt(e.target.value) || 1)}
                  className="font-light"
                />
                <p className="text-xs text-muted-foreground font-light">
                  Le tracker se répétera tous les {recurrenceValue} jour{recurrenceValue > 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !title}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer le tracker"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
