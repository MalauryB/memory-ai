import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function ProgressView() {
  const goals = [
    { name: "Développement web", progress: 75, tasks: 12, completed: 9 },
    { name: "Marathon", progress: 45, tasks: 20, completed: 9 },
    { name: "Lecture", progress: 33, tasks: 12, completed: 4 },
  ]

  return (
    <div className="space-y-12 max-w-3xl">
      <div className="space-y-4">
        <h2 className="text-4xl font-light tracking-tight text-balance">Votre progression</h2>
        <p className="text-lg text-muted-foreground font-light leading-relaxed">
          Vue d'ensemble de vos accomplissements
        </p>
      </div>

      <div className="space-y-8">
        {goals.map((goal, index) => (
          <Card key={index} className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-light">{goal.name}</h3>
                  <p className="text-sm text-muted-foreground font-light">
                    {goal.completed} / {goal.tasks} tâches complétées
                  </p>
                </div>
                <p className="text-3xl font-light">
                  {goal.progress}
                  <span className="text-lg text-muted-foreground">%</span>
                </p>
              </div>
              <Progress value={goal.progress} className="h-2" />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-8 border-accent/50 bg-accent/5 backdrop-blur-sm">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-light">Progression globale</p>
          <p className="text-5xl font-light">
            67<span className="text-2xl text-muted-foreground">%</span>
          </p>
          <p className="text-sm text-muted-foreground font-light">Vous êtes sur la bonne voie</p>
        </div>
      </Card>
    </div>
  )
}
