"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2 } from "lucide-react"
import { UpgradeModal } from "@/components/upgrade-modal"
import { AIUsageCounter } from "@/components/ai-usage-counter"

export function AIChat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Bonjour ! Je suis votre assistant Life Architect. Comment puis-je vous aider à atteindre vos objectifs aujourd'hui ?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [stats, setStats] = useState<any>(null)

  // Charger les stats au démarrage
  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/ai/stats?period=current')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    setIsLoading(true)

    try {
      // 1. Tracker la génération AVANT d'appeler l'IA
      const trackResponse = await fetch('/api/ai/track-generation', {
        method: 'POST'
      })
      const trackData = await trackResponse.json()

      // 2. Vérifier si limite atteinte
      if (!trackData.success && trackData.limit_reached) {
        setShowUpgradeModal(true)
        setIsLoading(false)
        return
      }

      // 3. Ajouter le message utilisateur
      const userMessage = input
      setMessages([...messages, { role: "user", content: userMessage }])
      setInput("")

      // 4. Simulate AI response (remplacer par votre vraie API IA)
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Je comprends. Laissez-moi vous aider à décomposer cet objectif en étapes réalisables.",
          },
        ])
        setIsLoading(false)

        // Rafraîchir les stats après la génération
        fetchStats()
      }, 1000)

    } catch (error) {
      console.error('Error sending message:', error)
      setIsLoading(false)
    }
  }

  const handleUpgrade = async () => {
    try {
      const response = await fetch('/api/account/upgrade', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        setShowUpgradeModal(false)
        fetchStats() // Rafraîchir les stats
        alert('Félicitations ! Vous êtes maintenant Premium ✨')
      }
    } catch (error) {
      console.error('Error upgrading:', error)
    }
  }

  return (
    <>
      <div className="space-y-8 max-w-3xl h-[calc(100vh-16rem)] flex flex-col">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-4xl font-light tracking-tight text-balance">Assistant IA</h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed">Discutez avec votre coach personnel</p>
            </div>
            {stats && <AIUsageCounter stats={stats} />}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.map((message, index) => (
            <Card
              key={index}
              className={`p-6 border-border/50 backdrop-blur-sm ${
                message.role === "assistant" ? "bg-card/50 border-l-2 border-l-accent" : "bg-accent/5 ml-8"
              }`}
            >
              <p className="font-light leading-relaxed text-pretty">{message.content}</p>
            </Card>
          ))}
          {isLoading && (
            <Card className="p-6 border-border/50 backdrop-blur-sm bg-card/50 border-l-2 border-l-accent">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="font-light text-muted-foreground">L'assistant réfléchit...</p>
              </div>
            </Card>
          )}
        </div>

        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
            placeholder="Posez une question ou partagez un objectif..."
            className="flex-1 bg-card/50 border-border/50 font-light"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            size="icon"
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
      />
    </>
  )
}
