import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface GoalCardProps {
  title: string
  progress: number
  deadline: string
  category: string
}

export function GoalCard({ title, progress, deadline, category }: GoalCardProps) {
  return (
    <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:border-accent/50 transition-colors cursor-pointer group">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <h4 className="font-light text-lg text-balance leading-relaxed group-hover:text-accent transition-colors">
              {title}
            </h4>
            <p className="text-sm text-muted-foreground font-light">{category}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-light">
              {progress}
              <span className="text-sm text-muted-foreground">%</span>
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
        <p className="text-xs text-muted-foreground font-light">{deadline}</p>
      </div>
    </Card>
  )
}
