"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

export function AIChat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Bonjour ! Je suis votre assistant Life Architect. Comment puis-je vous aider à atteindre vos objectifs aujourd'hui ?",
    },
  ])
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim()) return

    setMessages([...messages, { role: "user", content: input }])
    setInput("")

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Je comprends. Laissez-moi vous aider à décomposer cet objectif en étapes réalisables.",
        },
      ])
    }, 1000)
  }

  return (
    <div className="space-y-8 max-w-3xl h-[calc(100vh-16rem)] flex flex-col">
      <div className="space-y-4">
        <h2 className="text-4xl font-light tracking-tight text-balance">Assistant IA</h2>
        <p className="text-lg text-muted-foreground font-light leading-relaxed">Discutez avec votre coach personnel</p>
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
      </div>

      <div className="flex gap-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Posez une question ou partagez un objectif..."
          className="flex-1 bg-card/50 border-border/50 font-light"
        />
        <Button
          onClick={handleSend}
          size="icon"
          className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
