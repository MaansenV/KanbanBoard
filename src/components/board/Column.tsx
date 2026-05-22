import React from 'react'
import { MoreHorizontal, Trash2, Plus, Calendar } from 'lucide-react'
import type { VisibleColumn, Card as CardType, Column as ColumnType } from '../../types'
import { Card } from './Card'

type ColumnProps = {
  column: VisibleColumn
  hasActiveFilters: boolean
  foldedTaskIds: Set<string>
  onFoldToggle: (cardId: string) => void
  onEditCard: (columnId: string, card: CardType) => void
  onCopyCard: (columnId: string, cardId: string) => void
  onDeleteCard: (columnId: string, cardId: string) => void
  onSubtaskToggle: (columnId: string, cardId: string, subtaskId: string) => void
  onAddCard: (columnId: string) => void
  onEditColumn: (column: ColumnType) => void
  onDeleteColumn: (columnId: string) => void
  handleDragStart: (
    e: React.DragEvent<HTMLElement>,
    type: 'card' | 'column',
    id: string,
    sourceId: string | null
  ) => void
  handleDragEnd: (e: React.DragEvent<HTMLElement>) => void
  handleDropCard: (targetColId: string, targetIndex: number | null) => void
  handleDropColumn: (targetColId: string) => void
}

export const Column = ({
  column,
  hasActiveFilters,
  foldedTaskIds,
  onFoldToggle,
  onEditCard,
  onCopyCard,
  onDeleteCard,
  onSubtaskToggle,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
  handleDragStart,
  handleDragEnd,
  handleDropCard,
  handleDropColumn,
}: ColumnProps) => {
  return (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, 'column', column.id, null)}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.stopPropagation()
        handleDropColumn(column.id)
      }}
      className="group flex h-full w-80 flex-col rounded-2xl bg-secondary/30 ring-1 ring-border text-left select-none"
    >
      {/* Column Header */}
      <div className="flex cursor-grab items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-3 w-3 rounded-full shrink-0 ${column.color}`} />
          <span className="font-bold text-foreground truncate">
            {column.title}
          </span>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background/50 px-1.5 text-xs font-mono font-bold text-muted-foreground">
            {hasActiveFilters && column.cards.length !== column.totalCards
              ? `${column.cards.length}/${column.totalCards}`
              : column.totalCards}
          </span>
        </div>
        
        {/* Column Actions (Edit & Delete) */}
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEditColumn(column.sourceColumn)}
            className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
            title="Spalte bearbeiten"
          >
            <MoreHorizontal size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDeleteColumn(column.id)}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Spalte löschen"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Cards Area (Scrollable drop zone) */}
      <div
        className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-3 min-h-[150px]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.stopPropagation()
          handleDropCard(column.id, null)
        }}
      >
        {column.cards.map(({ card, originalIndex }) => (
          <Card
            key={card.id}
            card={card}
            columnId={column.id}
            originalIndex={originalIndex}
            isFolded={foldedTaskIds.has(card.id)}
            onFoldToggle={onFoldToggle}
            onEditCard={onEditCard}
            onCopyCard={onCopyCard}
            onDeleteCard={onDeleteCard}
            onSubtaskToggle={onSubtaskToggle}
            handleDragStart={handleDragStart}
            handleDragEnd={handleDragEnd}
            handleDropCard={handleDropCard}
          />
        ))}

        {column.cards.length === 0 && (
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground p-4 text-center">
            <div className="mb-2 rounded-full bg-secondary p-3">
              <Calendar size={20} className="text-muted-foreground" />
            </div>
            <span>
              {hasActiveFilters && column.totalCards > 0
                ? 'Keine passenden Aufgaben'
                : 'Keine Aufgaben vorhanden'}
            </span>
          </div>
        )}
      </div>

      {/* Column Footer: Add Card Button */}
      <div className="p-3 pt-0">
        <button
          type="button"
          onClick={() => onAddCard(column.id)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
        >
          <Plus size={16} /> Aufgabe hinzufügen
        </button>
      </div>
    </div>
  )
}
