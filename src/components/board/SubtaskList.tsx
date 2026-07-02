import { Check } from 'lucide-react'
import type { Subtask } from '../../types'

type SubtaskListProps = {
  subtasks: Subtask[]
  onToggle: (subtaskId: string) => void
}

export const SubtaskList = ({ subtasks, onToggle }: SubtaskListProps) => (
  <div className="mt-3 space-y-1.5">
    {subtasks.map((subtask) => (
      <div
        key={subtask.id}
        className="group flex items-center gap-2 rounded-md py-0.5 text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground cursor-pointer transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          onToggle(subtask.id)
        }}
      >
        <div
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-200 ${
            subtask.completed
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-muted-foreground/40 bg-card hover:border-primary/60'
          }`}
        >
          {subtask.completed && <Check size={10} strokeWidth={3} />}
        </div>
        <span className={`transition-all ${subtask.completed ? 'line-through opacity-50' : ''}`}>
          {subtask.title}
        </span>
      </div>
    ))}
  </div>
)
