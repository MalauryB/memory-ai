"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Settings2, Zap, Sparkles, Coffee, Plus, MapPin, Clock, X } from "lucide-react"

interface CustomActivity {
  id: string
  title: string
  description: string
  icon: string
  color: string
  activity_type: string
  estimated_duration: string
  can_combine_with: string[]
  location_name?: string
}

interface PlanningConfig {
  intensity: 'light' | 'moderate' | 'intense'
  style: 'mixed' | 'thematic_blocks'
  selectedActivities: string[]
}

interface PlanningConfiguratorProps {
  onGenerate: (config: PlanningConfig) => void
  loading: boolean
}

export function PlanningConfigurator({ onGenerate, loading }: PlanningConfiguratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'intense'>('moderate')
  const [style, setStyle] = useState<'mixed' | 'thematic_blocks'>('mixed')
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [customActivities, setCustomActivities] = useState<CustomActivity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [showNewActivityForm, setShowNewActivityForm] = useState(false)
  const [newActivityTitle, setNewActivityTitle] = useState("")
  const [newActivityDuration, setNewActivityDuration] = useState("30min")

  useEffect(() => {
    if (isOpen) {
      fetchCustomActivities()
    }
  }, [isOpen])

  async function fetchCustomActivities() {
    setLoadingActivities(true)
    try {
      const response = await fetch("/api/custom-activities")
      if (response.ok) {
        const data = await response.json()
        setCustomActivities(data.activities || [])
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setLoadingActivities(false)
    }
  }

  async function createQuickActivity() {
    if (!newActivityTitle.trim()) return

    try {
      const response = await fetch("/api/custom-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newActivityTitle,
          description: "",
          activity_type: "leisure",
          estimated_duration: newActivityDuration,
          icon: "coffee",
          color: "#6366f1"
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCustomActivities([data.activity, ...customActivities])
        setSelectedActivities([...selectedActivities, data.activity.id])
        setNewActivityTitle("")
        setNewActivityDuration("30min")
        setShowNewActivityForm(false)
      }
    } catch (error) {
      console.error("Erreur:", error)
    }
  }

  function toggleActivity(activityId: string) {
    setSelectedActivities(prev =>
      prev.includes(activityId)
        ? prev.filter(id => id !== activityId)
        : [...prev, activityId]
    )
  }

  async function deleteActivity(activityId: string, event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()

    try {
      const response = await fetch(`/api/custom-activities/${activityId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setCustomActivities(prev => prev.filter(a => a.id !== activityId))
        setSelectedActivities(prev => prev.filter(id => id !== activityId))
      }
    } catch (error) {
      console.error("Erreur suppression:", error)
    }
  }

  const handleGenerate = () => {
    onGenerate({
      intensity,
      style,
      selectedActivities
    })
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Configurer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light">Configuration du planning</DialogTitle>
          <DialogDescription className="font-light">
            Personnalisez votre journée selon votre niveau d'énergie et vos préférences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-6">
          {/* Intensité */}
          <div className="space-y-4">
            <div>
              <h3 className="font-light text-lg mb-2">Intensité de la journée</h3>
              <p className="text-sm text-muted-foreground font-light">
                Ajustez la charge de travail selon votre motivation
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <IntensityCard
                icon={<Coffee className="h-6 w-6" />}
                title="Légère"
                description="60% de travail, pauses fréquentes"
                color="bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30"
                selected={intensity === 'light'}
                onClick={() => setIntensity('light')}
              />
              <IntensityCard
                icon={<Sparkles className="h-6 w-6" />}
                title="Modérée"
                description="75% de travail, équilibre optimal"
                color="bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30"
                selected={intensity === 'moderate'}
                onClick={() => setIntensity('moderate')}
              />
              <IntensityCard
                icon={<Zap className="h-6 w-6" />}
                title="Intense"
                description="90% de travail, pauses courtes"
                color="bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30"
                selected={intensity === 'intense'}
                onClick={() => setIntensity('intense')}
              />
            </div>
          </div>

          {/* Style de planification */}
          <div className="space-y-4">
            <div>
              <h3 className="font-light text-lg mb-2">Style de planification</h3>
              <p className="text-sm text-muted-foreground font-light">
                Organisez vos tâches par thème ou variez les activités
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StyleCard
                title="Mixte"
                description="Alternez entre différents projets pour garder l'esprit frais"
                selected={style === 'mixed'}
                onClick={() => setStyle('mixed')}
              />
              <StyleCard
                title="Blocs thématiques"
                description="Groupez les tâches par projet pour un focus profond"
                selected={style === 'thematic_blocks'}
                onClick={() => setStyle('thematic_blocks')}
              />
            </div>
          </div>

          {/* Activités personnalisées */}
          <div className="space-y-4">
            <div>
              <h3 className="font-light text-lg mb-2">Activités à inclure</h3>
              <p className="text-sm text-muted-foreground font-light">
                Sélectionnez des activités personnelles à ajouter à votre planning
              </p>
            </div>

            {loadingActivities ? (
              <div className="text-center py-4 text-sm text-muted-foreground font-light">
                Chargement...
              </div>
            ) : (
              <div className="space-y-3">
                {customActivities.length > 0 && (
                  <div className="grid gap-2 max-h-48 overflow-y-auto pr-2">
                    {customActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="relative group"
                      >
                        <label
                          className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-accent/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedActivities.includes(activity.id)}
                            onCheckedChange={() => toggleActivity(activity.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-light text-sm">{activity.title}</p>
                              {activity.can_combine_with?.length > 0 && (
                                <Badge variant="outline" className="text-xs font-light">
                                  Combinable
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {activity.estimated_duration}
                              </span>
                              {activity.location_name && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {activity.location_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                        <button
                          onClick={(e) => deleteActivity(activity.id, e)}
                          className="absolute top-2 right-2 p-1 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                          title="Supprimer cette activité"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ajout rapide */}
                {showNewActivityForm ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Ex: Aller à la piscine, Prendre un café..."
                      value={newActivityTitle}
                      onChange={(e) => setNewActivityTitle(e.target.value)}
                      autoFocus
                      className="font-light"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <select
                          value={newActivityDuration}
                          onChange={(e) => setNewActivityDuration(e.target.value)}
                          className="w-full h-9 px-3 rounded-md border border-input bg-background font-light text-sm"
                        >
                          <option value="15min">15 min</option>
                          <option value="30min">30 min</option>
                          <option value="45min">45 min</option>
                          <option value="1h">1 heure</option>
                          <option value="1h30">1h30</option>
                          <option value="2h">2 heures</option>
                          <option value="3h">3 heures</option>
                        </select>
                      </div>
                      <Button size="sm" onClick={createQuickActivity}>
                        Ajouter
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setShowNewActivityForm(false)
                        setNewActivityTitle("")
                        setNewActivityDuration("30min")
                      }}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewActivityForm(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une activité
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Résumé de la configuration */}
          <Card className="p-4 bg-accent/5 border-accent/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-accent mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-light">
                  <strong className="font-medium">Votre configuration :</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="font-light">
                    Intensité {intensity === 'light' ? 'légère' : intensity === 'moderate' ? 'modérée' : 'intense'}
                  </Badge>
                  <Badge variant="secondary" className="font-light">
                    Style {style === 'mixed' ? 'mixte' : 'en blocs'}
                  </Badge>
                  {selectedActivities.length > 0 && (
                    <Badge variant="secondary" className="font-light">
                      {selectedActivities.length} activité{selectedActivities.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-light pt-2">
                  💡 Le système suggérera automatiquement des activités relaxantes adaptées
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "Génération..." : "Générer le planning"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface IntensityCardProps {
  icon: React.ReactNode
  title: string
  description: string
  color: string
  selected: boolean
  onClick: () => void
}

function IntensityCard({ icon, title, description, color, selected, onClick }: IntensityCardProps) {
  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-lg border-2 transition-all text-left ${color} ${
        selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {icon}
          {selected && (
            <div className="h-2 w-2 rounded-full bg-accent"></div>
          )}
        </div>
        <div className="space-y-1">
          <h4 className="font-light text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </button>
  )
}

interface StyleCardProps {
  title: string
  description: string
  selected: boolean
  onClick: () => void
}

function StyleCard({ title, description, selected, onClick }: StyleCardProps) {
  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-lg border-2 transition-all text-left ${
        selected
          ? 'border-accent bg-accent/10 ring-2 ring-accent ring-offset-2 ring-offset-background'
          : 'border-border/50 bg-card/50 hover:border-accent/50'
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-light">{title}</h4>
          {selected && (
            <div className="h-2 w-2 rounded-full bg-accent"></div>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-light leading-relaxed">
          {description}
        </p>
      </div>
    </button>
  )
}
