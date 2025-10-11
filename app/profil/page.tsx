"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Loader2, Save, User, MapPin, Clock, Bell, Calendar } from "lucide-react"
import { getUser } from "@/lib/auth"

interface UserProfile {
  user_id?: string
  full_name: string
  bio: string
  avatar_url: string
  location: string
  timezone: string
  work_hours_start: string
  work_hours_end: string
  preferred_work_days: number[]
  daily_work_hours: number
  notification_enabled: boolean
  notification_time: string
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
]

const TIMEZONES = [
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "Europe/London", label: "Londres (UTC+0)" },
  { value: "America/New_York", label: "New York (UTC-5)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-8)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
]

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile>({
    full_name: "",
    bio: "",
    avatar_url: "",
    location: "",
    timezone: "Europe/Paris",
    work_hours_start: "09:00",
    work_hours_end: "18:00",
    preferred_work_days: [1, 2, 3, 4, 5],
    daily_work_hours: 8,
    notification_enabled: true,
    notification_time: "09:00",
  })

  useEffect(() => {
    checkUserAndFetchProfile()
  }, [])

  async function checkUserAndFetchProfile() {
    const user = await getUser()
    if (!user) {
      router.push("/auth")
      return
    }
    await fetchProfile()
  }

  async function fetchProfile() {
    try {
      const response = await fetch("/api/profile")
      if (response.ok) {
        const data = await response.json()
        // Convertir les heures de format HH:MM:SS à HH:MM
        const profileData = {
          ...data.profile,
          work_hours_start: data.profile.work_hours_start?.substring(0, 5) || "09:00",
          work_hours_end: data.profile.work_hours_end?.substring(0, 5) || "18:00",
          notification_time: data.profile.notification_time?.substring(0, 5) || "09:00",
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
          work_hours_start: profile.work_hours_start + ":00",
          work_hours_end: profile.work_hours_end + ":00",
          notification_time: profile.notification_time + ":00",
        }),
      })

      if (response.ok) {
        alert("Profil sauvegardé avec succès !")
      } else {
        alert("Erreur lors de la sauvegarde")
      }
    } catch (error) {
      console.error("Erreur:", error)
      alert("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const toggleWorkDay = (day: number) => {
    if (profile.preferred_work_days.includes(day)) {
      setProfile({
        ...profile,
        preferred_work_days: profile.preferred_work_days.filter((d) => d !== day),
      })
    } else {
      setProfile({
        ...profile,
        preferred_work_days: [...profile.preferred_work_days, day].sort(),
      })
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={saveProfile} disabled={saving} className="font-light">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-light tracking-tight">Mon profil</h1>
            <p className="text-muted-foreground font-light">
              Gérez vos informations personnelles et vos préférences de travail
            </p>
          </div>

          {/* Informations personnelles */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-xl font-light">Informations personnelles</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="font-light">
                  Nom complet
                </Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Votre nom complet"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="font-light">
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Parlez-nous de vous..."
                  className="min-h-[100px] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="font-light flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localisation
                  </Label>
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    placeholder="Ville, Pays"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone" className="font-light flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Fuseau horaire
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

          {/* Planning de travail */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-xl font-light">Planning de travail</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="work_hours_start" className="font-light">
                    Heure de début
                  </Label>
                  <Input
                    id="work_hours_start"
                    type="time"
                    value={profile.work_hours_start}
                    onChange={(e) => setProfile({ ...profile, work_hours_start: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work_hours_end" className="font-light">
                    Heure de fin
                  </Label>
                  <Input
                    id="work_hours_end"
                    type="time"
                    value={profile.work_hours_end}
                    onChange={(e) => setProfile({ ...profile, work_hours_end: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daily_work_hours" className="font-light">
                    Heures par jour
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
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-light">Jours de travail préférés</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={profile.preferred_work_days.includes(day.value) ? "default" : "outline"}
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

          {/* Notifications */}
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-6">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-xl font-light">Notifications</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="notification_enabled" className="font-light">
                    Activer les notifications
                  </Label>
                  <p className="text-sm text-muted-foreground font-light">
                    Recevez des rappels pour vos tâches et objectifs
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
                  {profile.notification_enabled ? "Activé" : "Désactivé"}
                </Button>
              </div>

              {profile.notification_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="notification_time" className="font-light">
                    Heure de notification quotidienne
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
        </div>
      </main>
    </div>
  )
}
