"use client"

import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

interface PremiumBadgeProps {
  accountType: string
  variant?: "default" | "large"
  showIcon?: boolean
}

export function PremiumBadge({ accountType, variant = "default", showIcon = true }: PremiumBadgeProps) {
  if (accountType !== 'premium') {
    return null
  }

  if (variant === "large") {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold">
        {showIcon && <Sparkles className="h-4 w-4" />}
        <span>Premium</span>
      </div>
    )
  }

  return (
    <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0">
      {showIcon && <Sparkles className="h-3 w-3 mr-1" />}
      Premium
    </Badge>
  )
}
