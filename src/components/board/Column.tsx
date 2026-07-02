import React from 'react'
import { MoreHorizontal, Trash2, Plus, Calendar, Eraser } from 'lucide-react'
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
  onClearColumn: (columnId: string) => void
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
  onClearColumn,
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
      className="group flex h-full w-80 flex-col rounded-2xl border border-border/50 bg-secondary/40 ring-1 ring-border text-left select-none transition-all duration-300 hover:border-border hover:bg-secondary/50"
    >
      {/* Column Header */}
      <div className="flex cursor-grab items-center justify-between p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`h-3 w-3 shrink-0 rounded-full ${column.color}`} />
          <span className="truncate font-bold text-foreground">
            {column.title}
          </span>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background/70 px-1.5 font-mono text-xs font-bold text-muted-foreground">
            {hasActiveFilters && column.cards.length !== column.totalCards
              ? `${column.cards.length}/${column.totalCards}`
              : column.totalCards}
          </span>
        </div>

        {/* Column Actions (Edit & Delete) */}
        <div className="flex gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEditColumn(column.sourceColumn)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Spalte bearbeiten"
          >
            <MoreHorizontal size={16} />
          </button>
          <button
            type="button"
            onClick={() => onClearColumn(column.id)}
            disabled={column.totalCards === 0}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-orange-500/10 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            title={column.totalCards === 0 ? 'Spalte ist bereits leer' : `Alle ${column.totalCards} Aufgaben leeren`}
          >
            <Eraser size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDeleteColumn(column.id)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
            columnTitle={column.title}
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
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-4 text-center text-sm font-medium text-muted-foreground">
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
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/40 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 hover:text-primary active:scale-95"
        >
          <Plus size={16} /> Aufgabe hinzufügen
        </button>
      </div>
    </div>
  )
}
