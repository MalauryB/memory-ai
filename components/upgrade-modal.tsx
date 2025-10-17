"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Sparkles, Check } from "lucide-react"

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  onUpgrade: () => void
}

export function UpgradeModal({ open, onClose, onUpgrade }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-emerald-600" />
            Passez à Premium
          </DialogTitle>
          <DialogDescription className="text-base">
            Vous avez atteint votre limite mensuelle de générations IA. Débloquez l'accès illimité avec Premium.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border-2 border-emerald-600/20 bg-gradient-to-r from-emerald-900/20 to-emerald-700/20 p-6">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">À partir de</p>
              <p className="text-4xl font-bold">4.99€</p>
              <p className="text-sm text-muted-foreground">/mois</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Avantages Premium :</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm">Générations IA illimitées</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm">Réponses prioritaires</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm">Modèles IA avancés</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm">Support prioritaire</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm">Nouvelles fonctionnalités en avant-première</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2">
            Sans engagement. Annulez à tout moment.
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 text-white"
            size="lg"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Passer à Premium
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full"
          >
            Plus tard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
