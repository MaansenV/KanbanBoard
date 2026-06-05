import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Card, PriorityKey, Subtask, Agent, TaskDispatch } from '../../types'
import { PRIORITIES } from '../../types'
import { Button } from '../ui/Button'
import { InputGroup } from '../ui/InputGroup'
import { Modal } from '../ui/Modal'
import { generateId } from '../../utils/helpers'
import { DispatchPanel } from '../dispatch/DispatchPanel'

type CardFormProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    title: string
    description: string
    priority: PriorityKey
    subtasks: Subtask[]
  }) => void
  mode: 'create' | 'edit'
  initialData?: Card
  darkMode?: boolean
  // Agent Dispatch props
  agents?: Agent[]
  dispatches?: TaskDispatch[]
  dispatchLoading?: boolean
  dispatchError?: string | null
  dispatchDisabled?: boolean
  onCreateDispatch?: (data: {
    taskId: string
    agentId: string
    prompt: string
  }) => Promise<void> | void
  onCancelDispatch?: (dispatchId: string) => Promise<void> | void
  onRefreshDispatches?: (taskId: string) => void
}

export const CardForm = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
  agents = [],
  dispatches = [],
  dispatchLoading = false,
  dispatchError,
  dispatchDisabled = false,
  onCreateDispatch,
  onCancelDispatch,
  onRefreshDispatches,
}: CardFormProps) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<PriorityKey>('medium')
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title ?? '')
      setDescription(initialData?.description ?? '')
      setPriority(initialData?.priority ?? 'medium')
      setSubtasks(initialData?.subtasks ? [...initialData.subtasks] : [])
      setNewSubtaskTitle('')
    }
  }, [isOpen, initialData])

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return
    const newSubtask: Subtask = {
      id: generateId(),
      title: newSubtaskTitle.trim(),
      completed: false,
    }
    setSubtasks([...subtasks, newSubtask])
    setNewSubtaskTitle('')
  }

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((sub) => sub.id !== id))
  }

  const handleSubtaskTitleChange = (id: string, newTitle: string) => {
    setSubtasks(
      subtasks.map((sub) => (sub.id === id ? { ...sub, title: newTitle } : sub))
    )
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      subtasks,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <InputGroup
          label="Aufgabentitel"
          value={title}
          onChange={setTitle}
          placeholder="z.B. API Endpunkte dokumentieren"
        />

        <InputGroup
          label="Beschreibung"
          type="textarea"
          value={description}
          onChange={setDescription}
          placeholder="Detaillierte Beschreibung der Aufgabe..."
        />

        {/* Priority Selector */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Priorität
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as PriorityKey)}
            className="w-full rounded-lg border border-input bg-background/50 p-3 text-sm text-foreground transition-all focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {(Object.keys(PRIORITIES) as PriorityKey[]).map((key) => {
              const config = PRIORITIES[key]
              return (
                <option key={key} value={key} className="bg-background text-foreground">
                  {config.label}
                </option>
              )
            })}
          </select>
        </div>

        {/* Subtasks Checklist Builder */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Unteraufgaben (Checkliste)
          </label>
          
          {/* Subtask list */}
          {subtasks.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar border border-border/40 rounded-lg p-2 bg-secondary/15">
              {subtasks.map((sub, idx) => (
                <div key={sub.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono w-4">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={sub.title}
                    onChange={(e) => handleSubtaskTitleChange(sub.id, e.target.value)}
                    className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(sub.id)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                    title="Unteraufgabe löschen"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Subtask Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddSubtask()
                }
              }}
              placeholder="Unteraufgabe hinzufügen..."
              className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddSubtask}
              className="px-3 py-2 text-xs"
            >
              <Plus size={14} /> Hinzufügen
            </Button>
          </div>
        </div>

        {/* Agent Dispatch (only in edit mode) */}
        {mode === 'edit' && initialData?.id && (
          <DispatchPanel
            taskId={initialData.id}
            agents={agents}
            dispatches={dispatches}
            loading={dispatchLoading}
            error={dispatchError}
            disabled={dispatchDisabled}
            onCreateDispatch={onCreateDispatch ?? (async () => {})}
            onCancelDispatch={onCancelDispatch}
            onRefresh={onRefreshDispatches}
          />
        )}

        {/* Form Action Buttons */}
        <div className="mt-6 flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit">
            {mode === 'edit' ? 'Speichern' : 'Erstellen'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
