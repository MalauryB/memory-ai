"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setMessage({
            text: "Cet email est déjà utilisé. Veuillez vous connecter.",
            type: "error"
          })
        } else {
          setMessage({
            text: "Inscription réussie ! Vérifiez votre email pour confirmer votre compte.",
            type: "success"
          })
          setEmail("")
          setPassword("")
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (data.user) {
          setMessage({ text: "Connexion réussie !", type: "success" })
          setTimeout(() => router.push("/"), 500)
        }
      }
    } catch (error: any) {
      let errorMessage = "Une erreur est survenue"

      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Email ou mot de passe incorrect"
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Veuillez confirmer votre email avant de vous connecter"
      } else if (error.message.includes("Password should be at least 6 characters")) {
        errorMessage = "Le mot de passe doit contenir au moins 6 caractères"
      } else if (error.message) {
        errorMessage = error.message
      }

      setMessage({ text: errorMessage, type: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <Card className="w-full max-w-md p-8 space-y-8 border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-light tracking-tight">Life Architect</h1>
          <p className="text-muted-foreground font-light">
            {isSignUp ? "Créer un compte" : "Connexion à votre compte"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-light">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="bg-card/50 border-border/50 font-light"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="font-light">
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-card/50 border-border/50 font-light"
            />
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg border font-light text-sm ${
                message.type === "error"
                  ? "bg-red-500/10 border-red-500/50 text-red-500"
                  : "bg-accent/10 border-accent/50 text-accent"
              }`}
            >
              {message.text}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-light"
          >
            {loading ? "Chargement..." : isSignUp ? "S'inscrire" : "Se connecter"}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-muted-foreground hover:text-accent font-light transition-colors"
          >
            {isSignUp ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
          </button>
        </div>
      </Card>
    </div>
  )
}
