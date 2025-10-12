"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectStep {
  id: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "completed"
  order_index: number
  estimated_duration?: string // Format: "2 jours", "1 semaine", etc.
}

interface ProjectTimelineCalendarProps {
  projectId: string
  projectStartDate?: string // Format: YYYY-MM-DD
  projectDeadline?: string // Format: YYYY-MM-DD
  steps: ProjectStep[]
}

// Fonction pour convertir une durée estimée en jours
function parseDuration(duration?: string): number {
  if (!duration) return 7 // Par défaut: 1 semaine

  const lower = duration.toLowerCase()

  // Extraire le nombre
  const numberMatch = lower.match(/(\d+)/)
  const number = numberMatch ? parseInt(numberMatch[1]) : 1

  // Détecter l'unité
  if (lower.includes("jour")) return number
  if (lower.includes("semaine")) return number * 7
  if (lower.includes("mois")) return number * 30
  if (lower.includes("an") || lower.includes("année")) return number * 365

  return 7 // Par défaut
}

// Calculer les dates prévisionnelles des étapes
function calculateStepDates(
  steps: ProjectStep[],
  startDate?: string,
  deadline?: string
): Map<string, { startDate: Date; endDate: Date }> {
  const stepDates = new Map<string, { startDate: Date; endDate: Date }>()

  if (steps.length === 0) {
    console.log("⚠️ Pas d'étapes", { stepsCount: steps.length })
    return stepDates
  }

  // Si on a une date de début ET une deadline, on distribue intelligemment
  if (startDate && deadline) {
    const projectStart = new Date(startDate)
    const projectEnd = new Date(deadline)
    const totalProjectDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))

    console.log("📊 Mode avec dates de début et fin")
    console.log("📊 Période du projet:", projectStart.toLocaleDateString(), "→", projectEnd.toLocaleDateString(), `(${totalProjectDays} jours)`)

    const sortedSteps = [...steps].sort((a, b) => a.order_index - b.order_index)

    // Calculer la durée totale estimée de toutes les étapes
    const totalEstimatedDays = sortedSteps.reduce((sum, step) => sum + parseDuration(step.estimated_duration), 0)

    console.log("📊 Durée totale estimée des étapes:", totalEstimatedDays, "jours")

    let currentDate = new Date(projectStart)

    for (const step of sortedSteps) {
      const stepDuration = parseDuration(step.estimated_duration)

      // Si les estimations dépassent le temps disponible, on ajuste proportionnellement
      const adjustedDuration = totalEstimatedDays > totalProjectDays
        ? Math.max(1, Math.floor((stepDuration / totalEstimatedDays) * totalProjectDays))
        : stepDuration

      const stepStartDate = new Date(currentDate)
      stepStartDate.setHours(0, 0, 0, 0)

      const stepEndDate = new Date(stepStartDate)
      stepEndDate.setDate(stepEndDate.getDate() + adjustedDuration - 1)
      stepEndDate.setHours(0, 0, 0, 0)

      console.log(`📊 Étape "${step.title}": ${stepStartDate.toLocaleDateString()} → ${stepEndDate.toLocaleDateString()} (${adjustedDuration} jours)`)

      stepDates.set(step.id, { startDate: stepStartDate, endDate: stepEndDate })

      // Passer à la date suivante
      currentDate = new Date(stepEndDate)
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return stepDates
  }

  // Sinon, si on a juste une deadline, on remonte depuis la fin
  if (deadline) {
    const deadlineDate = new Date(deadline)
    const sortedSteps = [...steps].sort((a, b) => b.order_index - a.order_index) // Tri inverse

    console.log("📊 Mode avec deadline uniquement - Calcul en remontant")
    console.log("📊 Deadline:", deadlineDate.toISOString())

    let currentEndDate = new Date(deadlineDate)

    for (const step of sortedSteps) {
      const durationDays = parseDuration(step.estimated_duration)
      const endDate = new Date(currentEndDate)
      endDate.setHours(0, 0, 0, 0)

      const stepStartDate = new Date(endDate)
      stepStartDate.setDate(stepStartDate.getDate() - durationDays + 1)

      console.log(`📊 Étape "${step.title}": ${stepStartDate.toLocaleDateString()} → ${endDate.toLocaleDateString()} (${durationDays} jours)`)

      stepDates.set(step.id, { startDate: stepStartDate, endDate })

      currentEndDate = new Date(stepStartDate)
      currentEndDate.setDate(currentEndDate.getDate() - 1)
    }

    return stepDates
  }

  // Si on a juste une date de début, on avance à partir du début
  if (startDate) {
    const projectStart = new Date(startDate)
    const sortedSteps = [...steps].sort((a, b) => a.order_index - b.order_index)

    console.log("📊 Mode avec date de début uniquement - Calcul en avançant")
    console.log("📊 Date de début:", projectStart.toISOString())

    let currentDate = new Date(projectStart)

    for (const step of sortedSteps) {
      const durationDays = parseDuration(step.estimated_duration)
      const stepStartDate = new Date(currentDate)
      stepStartDate.setHours(0, 0, 0, 0)

      const stepEndDate = new Date(stepStartDate)
      stepEndDate.setDate(stepEndDate.getDate() + durationDays - 1)

      console.log(`📊 Étape "${step.title}": ${stepStartDate.toLocaleDateString()} → ${stepEndDate.toLocaleDateString()} (${durationDays} jours)`)

      stepDates.set(step.id, { startDate: stepStartDate, endDate: stepEndDate })

      currentDate = new Date(stepEndDate)
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return stepDates
  }

  console.log("⚠️ Aucune date de début ou deadline définie")
  return stepDates
}

// Générer les jours du calendrier pour un mois donné
function generateCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const days: Date[] = []

  // Ajouter les jours du mois précédent pour remplir la première semaine
  const firstDayOfWeek = firstDay.getDay()
  const daysFromPrevMonth = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // Lundi = 0

  for (let i = daysFromPrevMonth; i > 0; i--) {
    const date = new Date(year, month, 1 - i)
    days.push(date)
  }

  // Ajouter tous les jours du mois
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day))
  }

  // Ajouter les jours du mois suivant pour remplir la dernière semaine
  const lastDayOfWeek = lastDay.getDay()
  const daysFromNextMonth = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek

  for (let i = 1; i <= daysFromNextMonth; i++) {
    days.push(new Date(year, month + 1, i))
  }

  return days
}

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
]

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

export function ProjectTimelineCalendar({ projectId, projectStartDate, projectDeadline, steps }: ProjectTimelineCalendarProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  // Calculer les dates prévisionnelles
  const stepDates = useMemo(() => {
    const dates = calculateStepDates(steps, projectStartDate, projectDeadline)
    console.log("📅 Calendrier - Steps:", steps)
    console.log("📅 Calendrier - Start date:", projectStartDate)
    console.log("📅 Calendrier - Deadline:", projectDeadline)
    console.log("📅 Calendrier - Dates calculées:", Array.from(dates.entries()))
    return dates
  }, [steps, projectStartDate, projectDeadline])

  // Générer les jours du calendrier
  const calendarDays = useMemo(() => generateCalendarDays(currentYear, currentMonth), [currentYear, currentMonth])

  // Trouver quelle(s) étape(s) sont prévues pour chaque jour
  const getStepsForDay = (date: Date): ProjectStep[] => {
    const stepsForDay: ProjectStep[] = []

    // Normaliser la date à minuit pour la comparaison
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)

    for (const step of steps) {
      const dates = stepDates.get(step.id)
      if (!dates) continue

      // Normaliser les dates de début et fin
      const normalizedStart = new Date(dates.startDate)
      normalizedStart.setHours(0, 0, 0, 0)

      const normalizedEnd = new Date(dates.endDate)
      normalizedEnd.setHours(0, 0, 0, 0)

      const dayTime = normalizedDate.getTime()
      const startTime = normalizedStart.getTime()
      const endTime = normalizedEnd.getTime()

      if (dayTime >= startTime && dayTime <= endTime) {
        stepsForDay.push(step)
      }
    }

    return stepsForDay
  }

  // Vérifier si c'est la date de deadline
  const isDeadlineDay = (date: Date): boolean => {
    if (!projectDeadline) return false
    const deadline = new Date(projectDeadline)
    return (
      date.getDate() === deadline.getDate() &&
      date.getMonth() === deadline.getMonth() &&
      date.getFullYear() === deadline.getFullYear()
    )
  }

  // Vérifier si c'est aujourd'hui
  const isToday = (date: Date): boolean => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Vérifier si le jour est dans le mois courant
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth
  }

  // Navigation
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }

  if (!projectStartDate && !projectDeadline) {
    return (
      <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-accent" />
        </div>
        <h3 className="text-lg font-light mb-2">Aucune date de début ou deadline définie</h3>
        <p className="text-sm text-muted-foreground font-light">
          Définissez au moins une date de début ou une deadline pour visualiser le calendrier prévisionnel de vos
          étapes.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec navigation */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-light tracking-tight">Calendrier prévisionnel</h2>
          <p className="text-sm text-muted-foreground font-light">
            Visualisation des étapes du projet en fonction de la deadline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday} className="font-light">
            <Calendar className="h-4 w-4 mr-2" />
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[160px] text-center">
            <span className="text-lg font-light">
              {MONTHS[currentMonth]} {currentYear}
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 text-xs font-light text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent" />
          <span>Deadline</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Aujourd'hui</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50" />
          <span>Étape complétée</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/50" />
          <span>Étape en cours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-muted border border-border" />
          <span>Étape planifiée</span>
        </div>
      </div>

      {/* Calendrier */}
      <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {DAYS.map((day) => (
            <div key={day} className="text-center text-sm font-light text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Jours du mois */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date, index) => {
            const stepsForDay = getStepsForDay(date)
            const isDeadline = isDeadlineDay(date)
            const isTodayDate = isToday(date)
            const inCurrentMonth = isCurrentMonth(date)

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[100px] p-2 rounded-lg border transition-colors",
                  inCurrentMonth ? "bg-background border-border/50" : "bg-muted/30 border-transparent",
                  isTodayDate && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                {/* Numéro du jour */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "text-sm font-light",
                      !inCurrentMonth && "text-muted-foreground/50",
                      isTodayDate && "font-semibold text-primary"
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {/* Indicateur deadline */}
                  {isDeadline && (
                    <div className="w-2 h-2 rounded-full bg-accent" title="Deadline du projet" />
                  )}
                </div>

                {/* Étapes du jour - Barres continues */}
                <div className="space-y-1">
                  {stepsForDay.map((step) => {
                    const dates = stepDates.get(step.id)
                    const isFirstDay =
                      dates &&
                      date.getDate() === dates.startDate.getDate() &&
                      date.getMonth() === dates.startDate.getMonth() &&
                      date.getFullYear() === dates.startDate.getFullYear()

                    const isLastDay =
                      dates &&
                      date.getDate() === dates.endDate.getDate() &&
                      date.getMonth() === dates.endDate.getMonth() &&
                      date.getFullYear() === dates.endDate.getFullYear()

                    return (
                      <div
                        key={step.id}
                        className={cn(
                          "h-6 flex items-center relative",
                          step.status === "completed" &&
                            "bg-green-500/20 border-l-2 border-green-500/50",
                          step.status === "in_progress" &&
                            "bg-blue-500/20 border-l-2 border-blue-500/50",
                          step.status === "pending" && "bg-muted/50 border-l-2 border-border",
                          isFirstDay && "rounded-l",
                          isLastDay && "rounded-r"
                        )}
                        title={`${step.title} (${step.status})`}
                      >
                        {/* Afficher le titre uniquement le premier jour */}
                        {isFirstDay && (
                          <span
                            className={cn(
                              "text-xs font-light px-2 truncate",
                              step.status === "completed" && "text-green-700 dark:text-green-300",
                              step.status === "in_progress" && "text-blue-700 dark:text-blue-300",
                              step.status === "pending" && "text-muted-foreground"
                            )}
                          >
                            {step.status === "completed" && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                            {step.status === "in_progress" && <Clock className="h-3 w-3 inline mr-1" />}
                            {step.title}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Liste des étapes avec leurs dates */}
      <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
        <h3 className="text-lg font-light mb-4">Planning détaillé des étapes</h3>
        <div className="space-y-3">
          {steps
            .sort((a, b) => a.order_index - b.order_index)
            .map((step) => {
              const dates = stepDates.get(step.id)
              if (!dates) return null

              return (
                <div
                  key={step.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        step.status === "completed" && "bg-green-500",
                        step.status === "in_progress" && "bg-blue-500",
                        step.status === "pending" && "bg-muted-foreground"
                      )}
                    />
                    <div>
                      <div className="font-light">{step.title}</div>
                      {step.estimated_duration && (
                        <div className="text-xs text-muted-foreground font-light">
                          Durée estimée: {step.estimated_duration}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground font-light">
                    {dates.startDate.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    →{" "}
                    {dates.endDate.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              )
            })}
        </div>
      </Card>
    </div>
  )
}
