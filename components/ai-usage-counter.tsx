"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

interface AIUsageCounterProps {
  stats: {
    account: {
      type: string
      is_premium: boolean
      limit: number | null
    }
    current_month: {
      generation_count: number
      remaining: number | null
      limit_reached: boolean
    }
  }
}

export function AIUsageCounter({ stats }: AIUsageCounterProps) {
  const { account, current_month } = stats

  if (account.is_premium) {
    return (
      <Card className="p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <div className="text-sm">
            <span className="font-semibold text-amber-500">Premium</span>
            <span className="text-muted-foreground ml-2">
              {current_month.generation_count} générations
            </span>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-3 bg-card/50 border-border/50">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold">
            {current_month.generation_count} / {account.limit}
          </span>
          <Badge variant={current_month.limit_reached ? "destructive" : "secondary"} className="text-xs">
            {current_month.remaining !== null ? `${current_month.remaining} restantes` : 'Illimité'}
          </Badge>
        </div>
        <div className="w-32 bg-muted rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              current_month.limit_reached
                ? 'bg-destructive'
                : current_month.remaining !== null && current_month.remaining <= 2
                ? 'bg-orange-500'
                : 'bg-primary'
            }`}
            style={{
              width: `${account.limit ? (current_month.generation_count / account.limit) * 100 : 0}%`
            }}
          />
        </div>
        {current_month.limit_reached && (
          <p className="text-xs text-destructive">
            Limite atteinte
          </p>
        )}
      </div>
    </Card>
  )
}
