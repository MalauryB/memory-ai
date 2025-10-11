import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock } from "lucide-react"

export function DailyPlanner() {
  const tasks = [
    { id: 1, title: "Réviser les concepts React", time: "09:00", completed: true },
    { id: 2, title: "Courir 5km", time: "11:00", completed: true },
    { id: 3, title: "Lire 30 pages", time: "14:00", completed: false },
    { id: 4, title: "Pratiquer le code", time: "16:00", completed: false },
    { id: 5, title: "Méditation", time: "20:00", completed: false },
  ]

  return (
    <div className="space-y-12 max-w-3xl">
      <div className="space-y-4">
        <h2 className="text-4xl font-light tracking-tight text-balance">Planning du jour</h2>
        <p className="text-lg text-muted-foreground font-light leading-relaxed">
          Aujourd'hui, {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card
            key={task.id}
            className={`p-6 border-border/50 bg-card/50 backdrop-blur-sm transition-all ${
              task.completed ? "opacity-50" : "hover:border-accent/50"
            }`}
          >
            <div className="flex items-center gap-4">
              <Checkbox checked={task.completed} className="rounded-full" />
              <div className="flex-1">
                <p className={`font-light text-lg ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-light font-mono">{task.time}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-light">
        Ajouter une tâche
      </Button>
    </div>
  )
}
