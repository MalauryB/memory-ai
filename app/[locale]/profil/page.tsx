"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Loader2, Save, User, MapPin, Clock, Bell, Calendar, Plus, Trash2, Ban, Shield, CreditCard, Crown } from "lucide-react"
import { getUser } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"
import { PremiumBadge } from "@/components/premium-badge"
import { cn } from "@/lib/utils"

interface UserProfile {
  user_id?: string
  full_name: string
  bio: string
  avatar_url: string
  birth_date: string
  gender: string
  location: string
  timezone: string
  wake_up_time: string
  sleep_time: string
  morning_routine: string
  morning_routine_duration: number
  night_routine: string
  night_routine_duration: number
  work_hours_start: string
  work_hours_end: string
  preferred_work_days: number[]
  daily_work_hours: number
  notification_enabled: boolean
  notification_time: string
  account_type?: string
}


interface BlockedTimeSlot {
  id: string
  title: string
  description: string
  start_time: string
  end_time: string
  days_of_week: number[]
}

const TIMEZONES = [
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "Europe/London", label: "Londres (UTC+0)" },
  { value: "America/New_York", label: "New York (UTC-5)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-8)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
]

type Section = "personal" | "subscription" | "rhythm" | "work" | "blocked" | "notifications" | "privacy"

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations("profile")
  const tCommon = useTranslations("common")

  const DAYS_OF_WEEK = [
    { value: 1, label: t("monday"), short: t("monday").substring(0, 3) },
    { value: 2, label: t("tuesday"), short: t("tuesday").substring(0, 3) },
    { value: 3, label: t("wednesday"), short: t("wednesday").substring(0, 3) },
    { value: 4, label: t("thursday"), short: t("thursday").substring(0, 3) },
    { value: 5, label: t("friday"), short: t("friday").substring(0, 3) },
    { value: 6, label: t("saturday"), short: t("saturday").substring(0, 3) },
    { value: 0, label: t("sunday"), short: t("sunday").substring(0, 3) },
  ]

  const GENDERS = [
    { value: "male", label: t("genderMale") },
    { value: "female", label: t("genderFemale") },
    { value: "non_binary", label: t("genderNonBinary") },
    { value: "other", label: t("genderOther") },
    { value: "prefer_not_to_say", label: t("genderPreferNotToSay") },
  ]

  const [activeSection, setActiveSection] = useState<Section>("personal")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [blockedSlots, setBlockedSlots] = useState<BlockedTimeSlot[]>([])
  const [showNewSlotForm, setShowNewSlotForm] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [newSlot, setNewSlot] = useState({
    title: "",
    description: "",
    start_time: "12:00",
    end_time: "13:00",
    days_of_week: [] as number[],
  })
  const [profile, setProfile] = useState<UserProfile>({
    full_name: "",
    bio: "",
    avatar_url: "",
    birth_date: "",
    gender: "",
    location: "",
    timezone: "Europe/Paris",
    wake_up_time: "07:00",
    sleep_time: "23:00",
    morning_routine: "",
    morning_routine_duration: 30,
    night_routine: "",
    night_routine_duration: 30,
    work_hours_start: "09:00",
    work_hours_end: "18:00",
    preferred_work_days: [1, 2, 3, 4, 5],
    daily_work_hours: 8,
    notification_enabled: true,
    notification_time: "09:00",
  })

  const sections = [
    { id: "personal" as Section, label: "Informations personnelles", icon: User },
    { id: "rhythm" as Section, label: "Rythme quotidien", icon: Clock },
    { id: "work" as Section, label: "Planning de travail", icon: Calendar },
    { id: "blocked" as Section, label: "Créneaux bloqués", icon: Ban },
    { id: "notifications" as Section, label: "Notifications", icon: Bell },
    { id: "subscription" as Section, label: "Abonnement", icon: CreditCard },
    { id: "privacy" as Section, label: "Confidentialité", icon: Shield },
  ]

  useEffect(() => {
    checkUserAndFetchProfile()
  }, [])

  async function checkUserAndFetchProfile() {
    const user = await getUser()
    if (!user) {
      router.push("/auth")
      return
    }
    await Promise.all([fetchProfile(), fetchBlockedSlots()])
  }

  async function fetchProfile() {
    try {
      const response = await fetch("/api/profile")
      if (response.ok) {
        const data = await response.json()
        const profileData = {
          ...data.profile,
          birth_date: data.profile.birth_date || "",
          gender: data.profile.gender || "",
          wake_up_time: data.profile.wake_up_time?.substring(0, 5) || "07:00",
          sleep_time: data.profile.sleep_time?.substring(0, 5) || "23:00",
          work_hours_start: data.profile.work_hours_start?.substring(0, 5) || "09:00",
          work_hours_end: data.profile.work_hours_end?.substring(0, 5) || "18:00",
          notification_time: data.profile.notification_time?.substring(0, 5) || "09:00",
          preferred_work_days: data.profile.preferred_work_days || [1, 2, 3, 4, 5],
          morning_routine: data.profile.morning_routine || "",
          night_routine: data.profile.night_routine || "",
          morning_routine_duration: data.profile.morning_routine_duration || 30,
          night_routine_duration: data.profile.night_routine_duration || 30,
          daily_work_hours: data.profile.daily_work_hours || 8,
          notification_enabled: data.profile.notification_enabled !== undefined ? data.profile.notification_enabled : true,
          account_type: data.profile.account_type || "standard",
        }
        setProfile(profileData)
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    setSaving(true)
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...profile,
          wake_up_time: profile.wake_up_time + ":00",
          sleep_time: profile.sleep_time + ":00",
          work_hours_start: profile.work_hours_start + ":00",
          work_hours_end: profile.work_hours_end + ":00",
          notification_time: profile.notification_time + ":00",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: t("profileSaved"),
          description: t("profileSavedDesc"),
        })
      } else {
        console.error("Erreur serveur:", data)
        toast({
          title: t("profileError"),
          description: `${t("profileErrorDesc")}: ${data.error || tCommon("error")}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erreur:", error)
      toast({
        title: t("profileError"),
        description: t("profileErrorDesc") + ": " + (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function fetchBlockedSlots() {
    try {
      const response = await fetch("/api/blocked-time-slots")
      if (response.ok) {
        const data = await response.json()
        const slotsWithFormattedTime = data.slots.map((slot: BlockedTimeSlot) => ({
          ...slot,
          start_time: slot.start_time.substring(0, 5),
          end_time: slot.end_time.substring(0, 5),
        }))
        setBlockedSlots(slotsWithFormattedTime)
      }
    } catch (error) {
      console.error("Erreur:", error)
    }
  }

  async function addBlockedSlot() {
    if (!newSlot.title || newSlot.days_of_week.length === 0) {
      toast({
        title: t("slotError"),
        description: t("slotErrorDesc"),
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/blocked-time-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSlot,
          start_time: newSlot.start_time + ":00",
          end_time: newSlot.end_time + ":00",
        }),
      })

      if (response.ok) {
        await fetchBlockedSlots()
        setShowNewSlotForm(false)
        setNewSlot({
          title: "",
          description: "",
          start_time: "12:00",
          end_time: "13:00",
          days_of_week: [],
        })
        toast({
          title: t("slotAdded"),
          description: t("slotAddedDesc"),
        })
      }
    } catch (error) {
      console.error("Erreur:", error)
      toast({
        title: t("slotError"),
        description: tCommon("error"),
        variant: "destructive",
      })
    }
  }

  async function deleteBlockedSlot(id: string) {
    try {
      const response = await fetch(`/api/blocked-time-slots/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setBlockedSlots(blockedSlots.filter((slot) => slot.id !== id))
        toast({
          title: t("slotDeleted"),
          description: t("slotDeletedDesc"),
        })
      }
    } catch (error) {
      console.error("Erreur:", error)
      toast({
        title: t("slotError"),
        description: tCommon("error"),
        variant: "destructive",
      })
    }
  }

  const toggleWorkDay = (day: number) => {
    const workDays = profile.preferred_work_days || []
    if (workDays.includes(day)) {
      setProfile({
        ...profile,
        preferred_work_days: workDays.filter((d) => d !== day),
      })
    } else {
      setProfile({
        ...profile,
        preferred_work_days: [...workDays, day].sort(),
      })
    }
  }

  const toggleNewSlotDay = (day: number) => {
    if (newSlot.days_of_week.includes(day)) {
      setNewSlot({
        ...newSlot,
        days_of_week: newSlot.days_of_week.filter((d) => d !== day),
      })
    } else {
      setNewSlot({
        ...newSlot,
        days_of_week: [...newSlot.days_of_week, day].sort(),
      })
    }
  }

  async function handleUpgradeToPremium() {
    setUpgrading(true)
    try {
      const response = await fetch("/api/account/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Compte Premium activé !",
          description: data.message,
        })
        await fetchProfile()
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Impossible d'activer le compte Premium",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erreur:", error)
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de l'activation",
        variant: "destructive",
      })
    } finally {
      setUpgrading(false)
    }
  }

  async function handleDowngradeToStandard() {
    setUpgrading(true)
    try {
      const response = await fetch("/api/account/upgrade", {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Compte Standard",
          description: data.message,
        })
        await fetchProfile()
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Impossible de changer le compte",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erreur:", error)
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite",
        variant: "destructive",
      })
    } finally {
      setUpgrading(false)
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
            {tCommon("back")}
          </Button>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={saveProfile} disabled={saving} className="font-light">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {tCommon("saving")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {tCommon("save")}
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header avec titre et badge */}
          <div className="mb-8 space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-light tracking-tight">{t("title")}</h1>
              <PremiumBadge accountType={profile.account_type || 'standard'} />
            </div>
            <p className="text-muted-foreground font-light">
              {t("subtitle")}
            </p>
          </div>

          {/* Layout avec sidebar */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Navigation */}
            <aside className="lg:w-64 flex-shrink-0">
              <Card className="p-2 border-border/50 bg-card/50 backdrop-blur-sm sticky top-24">
                <nav className="space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-light transition-colors",
                          activeSection === section.id
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-left">{section.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </Card>
            </aside>

            {/* Content Area */}
            <div className="flex-1 space-y-6">
              {/* Informations personnelles */}
              {activeSection === "personal" && (
                <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-xl font-light">Informations personnelles</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="font-light">
                        {t("fullName")}
                      </Label>
                      <Input
                        id="full_name"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        placeholder={t("fullNamePlaceholder")}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="birth_date" className="font-light">
                          {t("birthDate")}
                        </Label>
                        <Input
                          id="birth_date"
                          type="date"
                          value={profile.birth_date}
                          onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gender" className="font-light">
                          {t("gender")}
                        </Label>
                        <select
                          id="gender"
                          value={profile.gender}
                          onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">{t("genderSelect")}</option>
                          {GENDERS.map((gender) => (
                            <option key={gender.value} value={gender.value}>
                              {gender.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio" className="font-light">
                        {t("bio")}
                      </Label>
                      <Textarea
                        id="bio"
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder={t("bioPlaceholder")}
                        className="min-h-[100px] resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="location" className="font-light flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {t("location")}
                        </Label>
                        <Input
                          id="location"
                          value={profile.location}
                          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                          placeholder={t("locationPlaceholder")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="timezone" className="font-light flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {t("timezone")}
                        </Label>
                        <select
                          id="timezone"
                          value={profile.timezone}
                          onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {TIMEZONES.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Gestion de l'abonnement */}
              {activeSection === "subscription" && (
                <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-xl font-light">Gestion de l'abonnement</h3>
                  </div>

                  <div className="space-y-4">
                    {profile.account_type === 'premium' ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                          <Crown className="h-6 w-6 text-emerald-500" />
                          <div className="flex-1">
                            <h4 className="font-medium text-emerald-600 dark:text-emerald-400">Compte Premium actif</h4>
                            <p className="text-sm text-muted-foreground font-light">
                              Vous bénéficiez de toutes les fonctionnalités premium
                            </p>
                          </div>
                          <PremiumBadge accountType={profile.account_type} />
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Fonctionnalités Premium</h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                              Projets illimités
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                              Sous-tâches illimitées
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                              Assistant IA avancé
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                              Statistiques détaillées
                            </li>
                          </ul>
                        </div>

                        <Button
                          variant="outline"
                          onClick={handleDowngradeToStandard}
                          disabled={upgrading}
                          className="font-light"
                        >
                          {upgrading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Traitement...
                            </>
                          ) : (
                            "Passer au compte Standard"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
                          <User className="h-6 w-6 text-muted-foreground" />
                          <div className="flex-1">
                            <h4 className="font-medium">Compte Standard</h4>
                            <p className="text-sm text-muted-foreground font-light">
                              Passez à Premium pour débloquer toutes les fonctionnalités
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Avec Premium, obtenez :</h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-emerald-500" />
                              Projets illimités
                            </li>
                            <li className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-emerald-500" />
                              Sous-tâches illimitées
                            </li>
                            <li className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-emerald-500" />
                              Assistant IA avancé
                            </li>
                            <li className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-emerald-500" />
                              Statistiques détaillées et analytiques
                            </li>
                            <li className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-emerald-500" />
                              Support prioritaire
                            </li>
                          </ul>
                        </div>

                        <Button
                          onClick={handleUpgradeToPremium}
                          disabled={upgrading}
                          className="font-light bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                        >
                          {upgrading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Activation...
                            </>
                          ) : (
                            <>
                              <Crown className="h-4 w-4 mr-2" />
                              Passer à Premium
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Rythme quotidien */}
              {activeSection === "rhythm" && (
                <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-xl font-light">{t("dailyRhythm")}</h3>
                  </div>

                  <div className="space-y-6">
                    {/* Horaires */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground">{t("schedules")}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="wake_up_time" className="font-light">
                            {t("wakeUpTime")}
                          </Label>
                          <Input
                            id="wake_up_time"
                            type="time"
                            value={profile.wake_up_time}
                            onChange={(e) => setProfile({ ...profile, wake_up_time: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground font-light">
                            {t("wakeUpTimeDesc")}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="sleep_time" className="font-light">
                            {t("sleepTime")}
                          </Label>
                          <Input
                            id="sleep_time"
                            type="time"
                            value={profile.sleep_time}
                            onChange={(e) => setProfile({ ...profile, sleep_time: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground font-light">
                            {t("sleepTimeDesc")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Routine du matin */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground">{t("morningRoutine")}</h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="morning_routine" className="font-light">
                            {t("morningRoutineDesc")}
                          </Label>
                          <Textarea
                            id="morning_routine"
                            value={profile.morning_routine}
                            onChange={(e) => setProfile({ ...profile, morning_routine: e.target.value })}
                            placeholder={t("morningRoutinePlaceholder")}
                            className="min-h-[80px] resize-none"
                          />
                          <p className="text-xs text-muted-foreground font-light">
                            {t("morningRoutineHelp")}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="morning_routine_duration" className="font-light">
                            {t("morningRoutineDuration")}
                          </Label>
                          <Input
                            id="morning_routine_duration"
                            type="number"
                            min="0"
                            max="300"
                            value={profile.morning_routine_duration}
                            onChange={(e) =>
                              setProfile({ ...profile, morning_routine_duration: parseInt(e.target.value) || 30 })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Routine du soir */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground">{t("nightRoutine")}</h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="night_routine" className="font-light">
                            {t("nightRoutineDesc")}
                          </Label>
                          <Textarea
                            id="night_routine"
                            value={profile.night_routine}
                            onChange={(e) => setProfile({ ...profile, night_routine: e.target.value })}
                            placeholder={t("nightRoutinePlaceholder")}
                            className="min-h-[80px] resize-none"
                          />
                          <p className="text-xs text-muted-foreground font-light">
                            {t("nightRoutineHelp")}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="night_routine_duration" className="font-light">
                            {t("nightRoutineDuration")}
                          </Label>
                          <Input
                            id="night_routine_duration"
                            type="number"
                            min="0"
                            max="300"
                            value={profile.night_routine_duration}
                            onChange={(e) =>
                              setProfile({ ...profile, night_routine_duration: parseInt(e.target.value) || 30 })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Planning de travail */}
              {activeSection === "work" && (
                <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-xl font-light">{t("workSchedule")}</h3>
                  </div>

                  <p className="text-sm text-muted-foreground font-light">
                    {t("workScheduleDesc")}
                  </p>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="work_hours_start" className="font-light">
                          {t("workStart")}
                        </Label>
                        <Input
                          id="work_hours_start"
                          type="time"
                          value={profile.work_hours_start}
                          onChange={(e) => setProfile({ ...profile, work_hours_start: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground font-light">
                          {t("workStartDesc")}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="work_hours_end" className="font-light">
                          {t("workEnd")}
                        </Label>
                        <Input
                          id="work_hours_end"
                          type="time"
                          value={profile.work_hours_end}
                          onChange={(e) => setProfile({ ...profile, work_hours_end: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground font-light">
                          {t("workEndDesc")}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="daily_work_hours" className="font-light">
                          {t("dailyAvailableHours")}
                        </Label>
                        <Input
                          id="daily_work_hours"
                          type="number"
                          min="1"
                          max="24"
                          value={profile.daily_work_hours}
                          onChange={(e) =>
                            setProfile({ ...profile, daily_work_hours: parseInt(e.target.value) || 8 })
                          }
                        />
                        <p className="text-xs text-muted-foreground font-light">
                          {t("dailyAvailableHoursDesc")}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-light">{t("preferredWorkDays")}</Label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <Button
                            key={day.value}
                            type="button"
                            variant={profile.preferred_work_days?.includes(day.value) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleWorkDay(day.value)}
                            className="font-light"
                          >
                            {day.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Créneaux bloqués */}
              {activeSection === "blocked" && (
                <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ban className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-xl font-light">{t("blockedTimeSlots")}</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewSlotForm(!showNewSlotForm)}
                      className="font-light"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("addSlot")}
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground font-light">
                    {t("blockedTimeSlotsDesc")}
                  </p>

                  {/* Formulaire d'ajout */}
                  {showNewSlotForm && (
                    <Card className="p-4 border-accent/30 bg-accent/5">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="slot_title" className="font-light">
                            {t("slotTitle")}
                          </Label>
                          <Input
                            id="slot_title"
                            value={newSlot.title}
                            onChange={(e) => setNewSlot({ ...newSlot, title: e.target.value })}
                            placeholder={t("slotTitlePlaceholder")}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="slot_description" className="font-light">
                            {t("slotDescription")}
                          </Label>
                          <Textarea
                            id="slot_description"
                            value={newSlot.description}
                            onChange={(e) => setNewSlot({ ...newSlot, description: e.target.value })}
                            placeholder={t("slotDescriptionPlaceholder")}
                            className="min-h-[60px] resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="slot_start" className="font-light">
                              {t("slotStartTime")}
                            </Label>
                            <Input
                              id="slot_start"
                              type="time"
                              value={newSlot.start_time}
                              onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="slot_end" className="font-light">
                              {t("slotEndTime")}
                            </Label>
                            <Input
                              id="slot_end"
                              type="time"
                              value={newSlot.end_time}
                              onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="font-light">{t("slotDaysOfWeek")}</Label>
                          <div className="flex flex-wrap gap-2">
                            {DAYS_OF_WEEK.map((day) => (
                              <Button
                                key={day.value}
                                type="button"
                                variant={newSlot.days_of_week.includes(day.value) ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleNewSlotDay(day.value)}
                                className="font-light"
                              >
                                {day.short}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button onClick={addBlockedSlot} size="sm" className="font-light">
                            <Plus className="h-4 w-4 mr-2" />
                            {t("addSlotButton")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowNewSlotForm(false)}
                            className="font-light"
                          >
                            {tCommon("cancel")}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Liste des créneaux */}
                  {blockedSlots.length > 0 ? (
                    <div className="space-y-2">
                      {blockedSlots.map((slot) => (
                        <Card key={slot.id} className="p-4 border-border/30 bg-background/50">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{slot.title}</h4>
                                <span className="text-sm text-muted-foreground font-mono">
                                  {slot.start_time} - {slot.end_time}
                                </span>
                              </div>
                              {slot.description && (
                                <p className="text-sm text-muted-foreground font-light">{slot.description}</p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {slot.days_of_week.sort().map((dayValue) => {
                                  const day = DAYS_OF_WEEK.find((d) => d.value === dayValue)
                                  return (
                                    <span
                                      key={dayValue}
                                      className="px-2 py-0.5 text-xs rounded-full bg-accent/10 text-accent font-normal"
                                    >
                                      {day?.short}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteBlockedSlot(slot.id)}
                              className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-light text-center py-8">
                      {t("noBlockedSlots")}
                    </p>
                  )}
                </Card>
              )}

              {/* Notifications */}
              {activeSection === "notifications" && (
                <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-xl font-light">{t("notificationsTitle")}</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="notification_enabled" className="font-light">
                          {t("enableNotifications")}
                        </Label>
                        <p className="text-sm text-muted-foreground font-light">
                          {t("enableNotificationsDesc")}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant={profile.notification_enabled ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setProfile({ ...profile, notification_enabled: !profile.notification_enabled })
                        }
                        className="font-light"
                      >
                        {profile.notification_enabled ? t("enabled") : t("disabled")}
                      </Button>
                    </div>

                    {profile.notification_enabled && (
                      <div className="space-y-2">
                        <Label htmlFor="notification_time" className="font-light">
                          {t("notificationTime")}
                        </Label>
                        <Input
                          id="notification_time"
                          type="time"
                          value={profile.notification_time}
                          onChange={(e) => setProfile({ ...profile, notification_time: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Confidentialité */}
              {activeSection === "privacy" && (
                <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-xl font-light">{t("privacyTitle")}</h3>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground font-light">
                      {t("privacyDesc")}
                    </p>

                    <Button
                      variant="outline"
                      className="font-light w-full sm:w-auto"
                      onClick={() => router.push("/donnees")}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      {t("manageData")}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
