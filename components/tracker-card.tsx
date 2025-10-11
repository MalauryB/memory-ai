"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Flame, Calendar, Trash2, MoreVertical } from "lucide-react"
import { Tracker } from "@/types/tracker"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface TrackerCardProps {
  tracker: Tracker
  onComplete?: (trackerId: string, date: string) => void
  onClick?: () => void
  onDelete?: (trackerId: string) => void
  isCompletedToday?: boolean
}

export function TrackerCard({ tracker, onComplete, onClick, onDelete, isCompletedToday = false }: TrackerCardProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCompletedToday || !onComplete) return

    setIsCompleting(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      await onComplete(tracker.id, today)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(tracker.id)
    }
    setShowDeleteDialog(false)
  }

  const getFrequencyText = () => {
    switch (tracker.frequency) {
      case "daily":
        return "Tous les jours"
      case "every_x_days":
        return `Tous les ${tracker.frequency_value} jours`
      case "weekly":
        return "Hebdomadaire"
      default:
        return "Personnalisé"
    }
  }

  return (
    <>
      <Card
        className={cn(
          "p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:border-accent/50 transition-all cursor-pointer group",
          isCompletedToday && "border-accent/30 bg-accent/5"
        )}
        onClick={onClick}
      >
        <div className="space-y-4">
          {/* En-tête avec titre et boutons d'action */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <h4 className="font-light text-lg leading-tight group-hover:text-accent transition-colors">
                {tracker.title}
              </h4>
              {tracker.description && (
                <p className="text-sm text-muted-foreground font-light line-clamp-2">{tracker.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="icon"
                variant={isCompletedToday ? "default" : "outline"}
                className={cn(
                  "rounded-full",
                  isCompletedToday && "bg-accent text-accent-foreground hover:bg-accent/90"
                )}
                onClick={handleComplete}
                disabled={isCompletedToday || isCompleting}
              >
                <Check className={cn("h-4 w-4", isCompletedToday && "animate-in zoom-in duration-300")} />
              </Button>

              {onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="rounded-full">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDeleteDialog(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

        {/* Statistiques */}
        <div className="flex items-center gap-6 text-sm">
          {/* Streak actuel */}
          <div className="flex items-center gap-2">
            <Flame className={cn("h-4 w-4", tracker.current_streak > 0 ? "text-orange-500" : "text-muted-foreground")} />
            <div className="space-y-0.5">
              <p className="text-muted-foreground font-light text-xs">Série actuelle</p>
              <p className="font-light">{tracker.current_streak} jours</p>
            </div>
          </div>

          {/* Meilleur streak */}
          <div className="flex items-center gap-2">
            <div className="space-y-0.5">
              <p className="text-muted-foreground font-light text-xs">Meilleure série</p>
              <p className="font-light">{tracker.best_streak} jours</p>
            </div>
          </div>
        </div>

        {/* Informations supplémentaires */}
        <div className="flex items-center justify-between text-sm text-muted-foreground font-light">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>{getFrequencyText()}</span>
          </div>

          {tracker.category && (
            <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent">{tracker.category}</span>
          )}
        </div>

        {/* Barre de progression visuelle des complétions totales */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-light">
            <span>Complétions totales</span>
            <span className="font-medium">{tracker.total_completions}</span>
          </div>
        </div>
      </div>
    </Card>

    {/* Dialog de confirmation de suppression */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce tracker ?</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer "{tracker.title}" ? Cette action est irréversible et supprimera également
            tout l'historique de complétions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  )
}
