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
      <div
        className={cn(
          "flex items-center gap-4 p-3 rounded-lg border border-border hover:border-accent/50 transition-all cursor-pointer group",
          isCompletedToday && "border-accent/30 bg-accent/5"
        )}
        onClick={onClick}
      >
        {/* Bouton de complétion */}
        <Button
          size="icon"
          variant={isCompletedToday ? "default" : "outline"}
          className={cn(
            "rounded-full h-9 w-9 shrink-0",
            isCompletedToday && "bg-accent text-accent-foreground hover:bg-accent/90"
          )}
          onClick={handleComplete}
          disabled={isCompletedToday || isCompleting}
        >
          <Check className={cn("h-4 w-4", isCompletedToday && "animate-in zoom-in duration-300")} />
        </Button>

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm leading-tight group-hover:text-accent transition-colors truncate">
              {tracker.title}
            </h4>
            {tracker.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent shrink-0">{tracker.category}</span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Flame className={cn("h-3 w-3", tracker.current_streak > 0 ? "text-orange-500" : "text-muted-foreground")} />
              <span>{tracker.current_streak}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{getFrequencyText()}</span>
            </div>
            <span>•</span>
            <span>{tracker.total_completions} fois</span>
          </div>
        </div>

        {/* Menu d'actions */}
        {onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button size="icon" variant="ghost" className="rounded-full h-8 w-8 shrink-0">
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
