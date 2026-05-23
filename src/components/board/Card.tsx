import React, { useState } from 'react'
import { Edit2, Copy, Trash2, ChevronDown, ChevronRight, CheckCircle2, Check } from 'lucide-react'
import type { Card as CardType } from '../../types'
import { PRIORITIES } from '../../types'
import { SubtaskList } from './SubtaskList'

type CardProps = {
  card: CardType
  columnId: string
  columnTitle: string
  originalIndex: number
  isFolded: boolean
  onFoldToggle: (cardId: string) => void
  onEditCard: (columnId: string, card: CardType) => void
  onCopyCard: (columnId: string, cardId: string) => void
  onDeleteCard: (columnId: string, cardId: string) => void
  onSubtaskToggle: (columnId: string, cardId: string, subtaskId: string) => void
  handleDragStart: (
    e: React.DragEvent<HTMLElement>,
    type: 'card',
    id: string,
    sourceId: string | null
  ) => void
  handleDragEnd: (e: React.DragEvent<HTMLElement>) => void
  handleDropCard: (targetColId: string, targetIndex: number | null) => void
}

export const Card = ({
  card,
  columnId,
  columnTitle,
  originalIndex,
  isFolded,
  onFoldToggle,
  onEditCard,
  onCopyCard,
  onDeleteCard,
  onSubtaskToggle,
  handleDragStart,
  handleDragEnd,
  handleDropCard,
}: CardProps) => {
  const [copied, setCopied] = useState(false)
  const priorityInfo = PRIORITIES[card.priority]
  const subtasks = card.subtasks || []
  const subtaskCount = subtasks.length
  const completedSubtaskCount = subtasks.filter((s) => s.completed).length
  const progressPercent = subtaskCount > 0 ? Math.round((completedSubtaskCount / subtaskCount) * 100) : 0

  const handleCopyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const priorityLabel = priorityInfo?.label || card.priority
      const subtasksText = subtasks.length > 0
        ? '\n**Unteraufgaben:**\n' + subtasks.map((s) => `- [${s.completed ? 'x' : ' '}] ${s.title}`).join('\n')
        : ''

      const textToCopy = `**Titel:** ${card.title}
**Priorität:** ${priorityLabel}
**Status:** ${columnTitle}

**Beschreibung:**
${card.description || 'Keine Beschreibung vorhanden.'}
${subtasksText}`

      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onCopyCard(columnId, card.id)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation()
        handleDragStart(e, 'card', card.id, columnId)
      }}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => {
        e.preventDefault()
      }}
      onDrop={(e) => {
        e.stopPropagation()
        handleDropCard(columnId, originalIndex)
      }}
      className="group/card relative overflow-hidden cursor-grab rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-4 pl-5 shadow-sm transition-all duration-700 hover:duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/90 hover:shadow-md hover:shadow-primary/5 select-none text-left"
    >
      {/* Left Priority Accent Stripe */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[4px] rounded-l-xl ${
          card.priority === 'critical'
            ? 'bg-rose-500'
            : card.priority === 'high'
              ? 'bg-amber-500'
              : card.priority === 'medium'
                ? 'bg-blue-500'
                : 'bg-emerald-500'
        }`}
      />

      {/* Priority Badge & Actions */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <span
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${priorityInfo?.color}`}
        >
          {priorityInfo?.icon}
          <span>{priorityInfo?.label}</span>
        </span>

        <div className="flex items-center gap-1.5">
          {/* Fold toggle */}
          <button
            type="button"
            title={isFolded ? 'Details ausklappen' : 'Details einklappen'}
            onClick={(e) => {
              e.stopPropagation()
              onFoldToggle(card.id)
            }}
            className="inline-flex rounded p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            {isFolded ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Edit/Copy/Delete actions - visible on hover */}
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/card:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              title="Aufgabe bearbeiten"
              onClick={(e) => {
                e.stopPropagation()
                onEditCard(columnId, card)
              }}
              className="inline-flex rounded p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Edit2 size={14} />
            </button>
            <button
              type="button"
              title={copied ? 'Kopiert!' : 'Aufgabe in Zwischenablage kopieren (Markdown)'}
              onClick={handleCopyToClipboard}
              className={`inline-flex rounded p-1 transition-colors ${
                copied ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              title="Aufgabe  löschen"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteCard(columnId, card.id)
              }}
              className="inline-flex rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Card Title */}
      <h4 className={`mb-2 font-semibold text-card-foreground text-sm tracking-tight ${isFolded ? 'line-clamp-2' : ''}`}>
        {card.title}
      </h4>

      {/* Description */}
      {!isFolded && card.description && (
        <p className="text-xs leading-relaxed text-muted-foreground mb-3 font-normal">
          {card.description}
        </p>
      )}

      {/* Subtask Progress Bar */}
      {!isFolded && subtaskCount > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
            <span>Fortschritt</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden border border-border/20">
            <div
              className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist of subtasks */}
      {!isFolded && subtaskCount > 0 && (
        <SubtaskList
          subtasks={subtasks}
          onToggle={(subtaskId) => onSubtaskToggle(columnId, card.id, subtaskId)}
        />
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground font-mono">
          <span className="rounded bg-secondary/80 border border-border/40 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
            #{card.id.slice(0, 4)}
          </span>
          {subtaskCount > 0 && (
            <div className="flex items-center gap-1" title="Unteraufgaben">
              <CheckCircle2 size={11} className="text-muted-foreground" />
              <span>
                {completedSubtaskCount}/{subtaskCount}
              </span>
            </div>
          )}
          {isFolded && subtaskCount > 0 && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px]">
              {progressPercent}%
            </span>
          )}
        </div>

        {card.createdAt && (
          <span className="text-[9px] text-muted-foreground/50 font-mono">
            {new Date(card.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  )
}
