import { CheckCircle2 } from 'lucide-react'
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
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          onToggle(subtask.id)
        }}
      >
        <div
          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
            subtask.completed
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-muted-foreground/50 hover:border-primary'
          }`}
        >
          {subtask.completed && <CheckCircle2 size={10} />}
        </div>
        <span className={subtask.completed ? 'line-through opacity-50' : ''}>
          {subtask.title}
        </span>
      </div>
    ))}
  </div>
)
