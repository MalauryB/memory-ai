"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Download, Trash2, Shield, AlertTriangle, Loader2 } from "lucide-react"
import { getUser } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function DataPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const user = await getUser()
    if (!user) {
      router.push("/auth")
      return
    }
    setLoading(false)
  }

  async function exportData() {
    setExporting(true)
    try {
      const response = await fetch("/api/data/export")
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `life-architect-data-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Données exportées",
          description: "Vos données ont été téléchargées avec succès.",
        })
      } else {
        throw new Error("Erreur lors de l'export")
      }
    } catch (error) {
      console.error("Erreur:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'exporter vos données.",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  async function deleteAllData() {
    setDeleting(true)
    try {
      const response = await fetch("/api/data/delete", {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Données supprimées",
          description: "Toutes vos données ont été supprimées. Vous allez être déconnecté.",
        })
        // Rediriger vers la page de connexion après 2 secondes
        setTimeout(() => {
          router.push("/auth")
        }, 2000)
      } else {
        throw new Error("Erreur lors de la suppression")
      }
    } catch (error) {
      console.error("Erreur:", error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer vos données.",
        variant: "destructive",
      })
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <Button variant="ghost" className="font-light" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-light tracking-tight">Mes données et confidentialité</h1>
            <p className="text-muted-foreground font-light">
              Gérez vos données personnelles conformément au RGPD
            </p>
          </div>

          {/* Informations RGPD */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-xl font-light">Vos droits</h3>
            </div>

            <div className="space-y-4 text-sm font-light">
              <p>
                Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits
                suivants concernant vos données personnelles :
              </p>

              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Droit d'accès</strong> : Vous pouvez accéder à toutes vos
                  données à tout moment
                </li>
                <li>
                  <strong className="text-foreground">Droit à la portabilité</strong> : Vous pouvez exporter vos
                  données dans un format structuré
                </li>
                <li>
                  <strong className="text-foreground">Droit de rectification</strong> : Vous pouvez modifier vos
                  données via votre profil
                </li>
                <li>
                  <strong className="text-foreground">Droit à l'effacement</strong> : Vous pouvez supprimer
                  définitivement toutes vos données
                </li>
              </ul>

              <p className="text-muted-foreground">
                Vos données sont stockées de manière sécurisée et ne sont jamais partagées avec des tiers. Nous
                utilisons vos données uniquement pour vous fournir les fonctionnalités de l'application.
              </p>
            </div>
          </Card>

          {/* Export des données */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-xl font-light">Exporter mes données</h3>
            </div>

            <p className="text-sm text-muted-foreground font-light">
              Téléchargez une copie complète de toutes vos données au format JSON. Cela inclut votre profil, vos
              projets, vos tâches, vos trackers et vos plannings.
            </p>

            <Button onClick={exportData} disabled={exporting} className="font-light">
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger mes données
                </>
              )}
            </Button>
          </Card>

          {/* Suppression des données */}
          <Card className="p-6 border-border/50 bg-destructive/5 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="text-xl font-light">Supprimer mes données</h3>
            </div>

            <p className="text-sm text-muted-foreground font-light">
              La suppression de vos données est <strong>irréversible</strong>. Toutes vos informations, projets,
              tâches et historiques seront définitivement supprimés.
            </p>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting} className="font-light">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer toutes mes données
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      Cette action est <strong>irréversible</strong>. Toutes vos données seront définitivement
                      supprimées de nos serveurs.
                    </p>
                    <p className="text-destructive font-medium">
                      Cela inclut :
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Votre profil et préférences</li>
                      <li>Tous vos projets et étapes</li>
                      <li>Tous vos trackers et habitudes</li>
                      <li>Tout votre historique de complétion</li>
                      <li>Tous vos plannings journaliers</li>
                    </ul>
                    <p className="pt-2">
                      Nous vous recommandons d'exporter vos données avant de les supprimer.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteAllData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Oui, supprimer toutes mes données
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>

          {/* Informations légales */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-4">
            <h3 className="text-xl font-light">Informations complémentaires</h3>

            <div className="space-y-3 text-sm text-muted-foreground font-light">
              <div>
                <h4 className="font-medium text-foreground mb-1">Responsable du traitement</h4>
                <p>Life Architect</p>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-1">Durée de conservation</h4>
                <p>
                  Vos données sont conservées tant que votre compte est actif. Vous pouvez les supprimer à tout
                  moment.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-1">Sécurité</h4>
                <p>
                  Vos données sont chiffrées en transit (HTTPS) et au repos. L'accès est protégé par authentification
                  et des politiques de sécurité strictes (RLS).
                </p>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-1">Contact</h4>
                <p>
                  Pour toute question concernant vos données personnelles, vous pouvez nous contacter à{" "}
                  <a href="mailto:privacy@life-architect.app" className="text-accent hover:underline">
                    privacy@life-architect.app
                  </a>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
