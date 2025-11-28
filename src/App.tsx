import {
  Download,
  Edit2,
  Moon,
  Plus,
  Sun,
  Trash2,
  Upload,
  X,
  Layout,
  MoreHorizontal,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { ProjectStatistics } from './ProjectStatistics'

const PRIORITIES = {
  low: {
    label: 'Low',
    value: 1,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20',
    icon: <CheckCircle2 size={14} />,
  },
  medium: {
    label: 'Medium',
    value: 2,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20',
    icon: <Clock size={14} />,
  },
  high: {
    label: 'High',
    value: 3,
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-500/20',
    icon: <AlertCircle size={14} />,
  },
  critical: {
    label: 'Critical',
    value: 4,
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/20',
    icon: <AlertCircle size={14} />,
  },
} as const

type PriorityKey = keyof typeof PRIORITIES

type Card = {
  id: string
  title: string
  description?: string
  priority: PriorityKey
  createdAt?: number
  completedAt?: number
}

type Column = {
  id: string
  title: string
  color: string
  category: 'todo' | 'doing' | 'done' | 'bugs'
  cards: Card[]
}

type Board = {
  id: string
  title: string
  createdAt?: number
  columns: Column[]
}

type ModalType =
  | 'createBoard'
  | 'editBoard'
  | 'createColumn'
  | 'editColumn'
  | 'createCard'
  | 'editCard'
  | null

type ModalState = {
  type: ModalType
  data?: Record<string, unknown> | null
}

type DragType = 'card' | 'column' | null

type DragState = {
  type: DragType
  id: string | null
  sourceId: string | null
}

const generateId = () => Math.random().toString(36).slice(2, 11)

const deepClone = <T,>(value: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T

type ButtonProps = {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}

const Button = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled,
  type = 'button',
}: ButtonProps) => {
  const baseStyle =
    'px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 select-none disabled:opacity-50 disabled:cursor-not-allowed rounded-lg active:scale-95'
  const variants: Record<string, string> = {
    primary:
      'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25',
    secondary:
      'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border shadow-sm',
    danger:
      'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20',
    ghost:
      'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
    icon: 'p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  darkMode: boolean
}

const Modal = ({ isOpen, onClose, title, children, darkMode }: ModalProps) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md transform rounded-2xl glass-panel p-6 transition-all animate-slide-up ${darkMode ? 'dark' : ''}`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

type InputGroupProps = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'textarea'
  placeholder?: string
  children?: ReactNode
}

const InputGroup = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  children,
}: InputGroupProps) => (
  <div className="mb-4">
    <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-muted-foreground">
      {label}
      {children}
    </label>
    {type === 'textarea' ? (
      <textarea
        className="w-full rounded-lg border border-input bg-background/50 p-3 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <input
        type="text"
        className="w-full rounded-lg border border-input bg-background/50 p-3 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )}
  </div>
)

const App = () => {
  const [boards, setBoards] = useState<Board[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ type: null, data: null })
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    id: null,
    sourceId: null,
  })
  const [darkMode, setDarkMode] = useState(false)
  const [deletedCount, setDeletedCount] = useState(0)
  const [lastActivity, setLastActivity] = useState<number>(Date.now())

  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefersDark = window.matchMedia?.(
      '(prefers-color-scheme: dark)',
    ).matches
    if (prefersDark) {
      setDarkMode(true)
    }

    const saved = window.localStorage.getItem('kanban-boards')
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Board[]
        setBoards(parsed)
        if (parsed.length > 0) setActiveBoardId(parsed[0].id)
        return
      } catch (error) {
        console.error(error)
      }
    }

    const demoId = generateId()
    const demoBoard: Board = {
      id: demoId,
      title: 'Product Launch',
      createdAt: Date.now(),
      columns: [
        {
          id: generateId(),
          title: 'To Do',
          color: 'bg-slate-500',
          category: 'todo',
          cards: [],
        },
        {
          id: generateId(),
          title: 'In Progress',
          color: 'bg-blue-500',
          category: 'doing',
          cards: [],
        },
        {
          id: generateId(),
          title: 'Done',
          color: 'bg-emerald-500',
          category: 'done',
          cards: [],
        },
      ],
    }
    setBoards([demoBoard])
    setActiveBoardId(demoId)
  }, [])

  useEffect(() => {
    if (boards.length > 0) {
      window.localStorage.setItem('kanban-boards', JSON.stringify(boards))
    }
  }, [boards])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', darkMode)
  }, [darkMode])

  const activeBoard = useMemo(
    () => boards.find((b) => b.id === activeBoardId) ?? null,
    [boards, activeBoardId],
  )

  const handleDragStart = (
    e: React.DragEvent<HTMLElement>,
    type: DragType,
    id: string,
    sourceId: string | null = null,
  ) => {
    const target = e.currentTarget as HTMLElement
    setDragState({ type, id, sourceId })
    e.dataTransfer.effectAllowed = 'move'
    target.style.opacity = '0.4'
  }

  const handleDragEnd = (e: React.DragEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '1'
    setDragState({ type: null, id: null, sourceId: null })
  }

  const handleDropCard = (targetColId: string, targetIndex: number | null = null) => {
    if (dragState.type !== 'card' || !activeBoard) return
    setBoards((prev) => {
      const nextBoards = deepClone(prev)
      const board = nextBoards.find((b) => b.id === activeBoardId)
      if (!board) return prev
      const sourceCol = board.columns.find((c) => c.id === dragState.sourceId)
      const targetCol = board.columns.find((c) => c.id === targetColId)
      if (!sourceCol || !targetCol) return prev
      const cardIdx = sourceCol.cards.findIndex((c) => c.id === dragState.id)
      if (cardIdx === -1) return prev
      const [movedCard] = sourceCol.cards.splice(cardIdx, 1)

      // Update completedAt if moving to/from done column
      if (targetCol.category === 'done' && sourceCol.category !== 'done') {
        movedCard.completedAt = Date.now()
      } else if (targetCol.category !== 'done' && sourceCol.category === 'done') {
        movedCard.completedAt = undefined
      }

      if (targetIndex !== null) {
        targetCol.cards.splice(targetIndex, 0, movedCard)
      } else {
        targetCol.cards.push(movedCard)
      }
      setLastActivity(Date.now())
      return nextBoards
    })
  }

  const handleDropColumn = (targetColId: string) => {
    if (dragState.type !== 'column' || !activeBoard) return
    setBoards((prev) => {
      const nextBoards = deepClone(prev)
      const board = nextBoards.find((b) => b.id === activeBoardId)
      if (!board) return prev
      const sourceIdx = board.columns.findIndex((c) => c.id === dragState.id)
      const targetIdx = board.columns.findIndex((c) => c.id === targetColId)
      if (sourceIdx === -1 || targetIdx === -1) return prev
      const [movedCol] = board.columns.splice(sourceIdx, 1)
      board.columns.splice(targetIdx, 0, movedCol)
      setLastActivity(Date.now())
      return nextBoards
    })
  }

  const handleBoardDeletion = (boardId: string) => {
    if (!window.confirm('Delete board?')) return
    setBoards((prev) => {
      const filtered = prev.filter((b) => b.id !== boardId)
      if (activeBoardId === boardId) {
        setActiveBoardId(filtered.at(0)?.id ?? null)
      }
      return filtered
    })
  }

  const handleCardDeletion = (colId: string, cardId: string) => {
    if (!window.confirm('Delete task?')) return
    setBoards((prev) => {
      const next = deepClone(prev)
      const board = next.find((b) => b.id === activeBoardId)
      if (!board) return prev
      const col = board.columns.find((c) => c.id === colId)
      if (!col) return prev
      col.cards = col.cards.filter((c) => c.id !== cardId)
      col.cards = col.cards.filter((c) => c.id !== cardId)
      return next
    })
    setDeletedCount((prev) => prev + 1)
    setLastActivity(Date.now())
  }


  return (
    <div
      className={`relative z-10 min-h-screen font-sans transition-colors duration-300 ${darkMode ? 'dark' : ''}`}
    >
      <div className="fixed inset-0 -z-10 bg-background" />
      <div className={`fixed inset-0 -z-10 ${darkMode ? 'bg-mesh' : 'bg-mesh-light'}`} />

      <div className="mx-auto flex h-screen max-w-[1800px] flex-col p-4 md:p-6 lg:p-8">
        <header className="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between glass-panel rounded-2xl p-4 shadow-glass-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Layout size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground font-display">
                Kanban<span className="text-primary">Flow</span>
              </h1>
              <p className="text-xs font-medium text-muted-foreground">
                Workspace
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDarkMode((prev) => !prev)}>
              {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </Button>
            <div className="h-8 w-px bg-border mx-1" />
            <Button
              variant="secondary"
              onClick={() => {
                const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(boards))}`
                const anchor = document.createElement('a')
                anchor.href = dataStr
                anchor.download = 'kanban.json'
                anchor.click()
              }}
            >
              <Download size={16} /> Export
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = (ev) => {
                    try {
                      const parsed = JSON.parse(String(ev.target?.result)) as Board[]
                      setBoards(parsed)
                      setActiveBoardId(parsed.at(0)?.id ?? null)
                    } catch (error) {
                      console.error('Invalid JSON file', error)
                    }
                  }
                  reader.readAsText(file)
                }}
              />
              <div className="px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 select-none rounded-lg active:scale-95 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border shadow-sm cursor-pointer">
                <Upload size={16} /> Import
              </div>
            </label>
          </div>
        </header>

        <div className="flex flex-1 gap-6 overflow-hidden">
          <ProjectStatistics board={activeBoard} deletedCount={deletedCount} lastActivity={lastActivity} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => setActiveBoardId(board.id)}
                  className={`group relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${activeBoardId === board.id
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                >
                  {board.title}
                  {activeBoardId === board.id && (
                    <div className="ml-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          setModal({ type: 'editBoard', data: { board } })
                        }}
                        className="rounded-full p-0.5 text-primary-foreground/70 transition-all hover:bg-white/20 hover:text-white"
                      >
                        <Edit2 size={12} />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleBoardDeletion(board.id)
                        }}
                        className="rounded-full p-0.5 text-primary-foreground/70 transition-all hover:bg-white/20 hover:text-white"
                      >
                        <X size={14} />
                      </span>
                    </div>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setModal({ type: 'createBoard' })}
                className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-background/30 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-primary hover:bg-background/50 hover:text-primary"
              >
                <Plus size={16} /> New Board
              </button>
            </div>

            {activeBoard ? (
              <div className="flex-1 overflow-x-auto overflow-y-hidden rounded-3xl glass-panel p-6">
                <div className="flex h-full min-w-max gap-6">
                  {activeBoard.columns.map((col) => (
                    <div
                      key={col.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'column', col.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.stopPropagation()
                        handleDropColumn(col.id)
                      }}
                      className="group flex h-full w-80 flex-col rounded-2xl bg-secondary/30 ring-1 ring-border"
                    >
                      <div className="flex cursor-grab items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${col.color}`} />
                          <span className="font-bold text-foreground">
                            {col.title}
                          </span>
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background/50 px-1.5 text-xs font-medium text-muted-foreground">
                            {col.cards.length}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() =>
                              setModal({ type: 'editColumn', data: { boardId: activeBoardId, col } })
                            }
                            className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm('Delete?')) return
                              setBoards((prev) => {
                                const next = deepClone(prev)
                                const board = next.find((b) => b.id === activeBoardId)
                                if (!board) return prev
                                board.columns = board.columns.filter((c) => c.id !== col.id)
                                return next
                              })
                            }}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div
                        className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-3"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDropCard(col.id)}
                      >
                        {col.cards.map((card, idx) => (
                          <div
                            key={card.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation()
                              handleDragStart(e, 'card', card.id, col.id)
                            }}
                            onDragEnd={handleDragEnd}
                            onDrop={(e) => {
                              e.stopPropagation()
                              handleDropCard(col.id, idx)
                            }}
                            className="group/card relative cursor-grab rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-primary/20"
                          >
                            <div className="mb-3 flex items-start gap-3">
                              <span
                                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${PRIORITIES[card.priority]?.color}`}
                              >
                                {PRIORITIES[card.priority]?.icon}
                                {PRIORITIES[card.priority]?.label}
                              </span>
                              <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/card:opacity-100">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setModal({
                                      type: 'editCard',
                                      data: { boardId: activeBoardId, colId: col.id, card },
                                    })
                                  }}
                                  className="inline-flex rounded p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCardDeletion(col.id, card.id)
                                  }}
                                  className="inline-flex rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <h4 className="mb-2 font-semibold text-card-foreground">
                              {card.title}
                            </h4>
                            {card.description && (
                              <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                                {card.description}
                              </p>
                            )}
                            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                              <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                                <span>ID: {card.id.slice(0, 4)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {col.cards.length === 0 && (
                          <div className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground">
                            <div className="mb-2 rounded-full bg-secondary p-3">
                              <Calendar size={20} />
                            </div>
                            <span>No tasks yet</span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 pt-0">
                        <button
                          type="button"
                          onClick={() => setModal({ type: 'createCard', data: { colId: col.id } })}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
                        >
                          <Plus size={16} /> Add Task
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => setModal({ type: 'createColumn' })}
                      className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/30 text-muted-foreground transition-all hover:border-primary hover:bg-background hover:text-primary hover:shadow-lg"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-3xl glass-panel text-muted-foreground">
                <div className="mb-6 rounded-full bg-secondary p-8">
                  <Layout size={48} className="text-primary/50" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-foreground">
                  No Board Selected
                </h2>
                <p className="mb-6 max-w-xs text-center text-sm">
                  Create a new board to get started with your projects.
                </p>
                <Button onClick={() => setModal({ type: 'createBoard' })}>
                  <Plus size={16} /> Create New Board
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <BoardForm
        isOpen={modal.type === 'createBoard' || modal.type === 'editBoard'}
        mode={modal.type === 'createBoard' ? 'create' : 'edit'}
        initialData={modal.data?.board as Board | undefined}
        onClose={() => setModal({ type: null })}
        darkMode={darkMode}
        onSubmit={({ title }) => {
          if (!title.trim()) return
          const currentModal = modal
          setBoards((prev) => {
            if (currentModal.type === 'createBoard') {
              const newBoard: Board = { id: generateId(), title, createdAt: Date.now(), columns: [] }
              setActiveBoardId(newBoard.id)
              return [...prev, newBoard]
            } else if (currentModal.type === 'editBoard') {
              const modalBoard = currentModal.data?.board as Board | undefined
              return prev.map(b => b.id === modalBoard?.id ? { ...b, title } : b)
            }
            return prev
          })
          setModal({ type: null })
        }}
      />

      <ColumnForm
        isOpen={modal.type === 'createColumn' || modal.type === 'editColumn'}
        mode={modal.type === 'createColumn' ? 'create' : 'edit'}
        initialData={modal.data?.col as Column | undefined}
        onClose={() => setModal({ type: null })}
        darkMode={darkMode}
        onSubmit={({ title, color, category }) => {
          if (!activeBoardId || !title.trim()) return
          const currentModal = modal
          setBoards((prev) => {
            const next = deepClone(prev)
            const board = next.find((b) => b.id === activeBoardId)
            if (!board) return prev
            if (currentModal.type === 'createColumn') {
              board.columns.push({ id: generateId(), title, color, category, cards: [] })
            } else if (currentModal.type === 'editColumn') {
              const modalCol = currentModal.data?.col as Column | undefined
              const target = board.columns.find(
                (c) => c.id === modalCol?.id,
              )
              if (target) {
                target.title = title
                target.color = color
                target.category = category
              }
            }
            return next
          })
          setModal({ type: null })
        }}
      />

      <CardForm
        isOpen={modal.type === 'createCard' || modal.type === 'editCard'}
        mode={modal.type === 'createCard' ? 'create' : 'edit'}
        initialData={modal.data?.card as Card | undefined}
        onClose={() => setModal({ type: null })}
        darkMode={darkMode}
        onSubmit={({ title, description, priority }) => {
          if (!activeBoardId || !title.trim()) return
          const currentModal = modal
          const colId = currentModal.data?.colId as string | undefined
          if (!colId) return
          setBoards((prev) => {
            const next = deepClone(prev)
            const board = next.find((b) => b.id === activeBoardId)
            if (!board) return prev
            const col = board.columns.find((c) => c.id === colId)
            if (!col) return prev
            if (currentModal.type === 'createCard') {
              col.cards.push({ id: generateId(), title, description, priority, createdAt: Date.now() })
            } else if (currentModal.type === 'editCard') {
              const modalCard = currentModal.data?.card as Card | undefined
              const target = col.cards.find(
                (c) => c.id === modalCard?.id,
              )
              if (target) {
                target.title = title
                target.description = description
                target.priority = priority
              }
            }
            return next
          })
          setLastActivity(Date.now())
          setModal({ type: null })
        }}
      />
    </div>
  )
}

type BoardFormProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { title: string }) => void
  mode: 'create' | 'edit'
  initialData?: Board
  darkMode: boolean
}

const BoardForm = ({ isOpen, onClose, onSubmit, mode, initialData, darkMode }: BoardFormProps) => {
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title ?? '')
    }
  }, [isOpen, initialData])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ title })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'edit' ? 'Edit Project' : 'New Project'} darkMode={darkMode}>
      <form onSubmit={handleSubmit}>
        <InputGroup label="Project Name" value={title} onChange={setTitle} placeholder="e.g. Website Redesign" />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{mode === 'edit' ? 'Save Changes' : 'Create Project'}</Button>
        </div>
      </form>
    </Modal>
  )
}

type ColumnFormProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { title: string; color: string; category: 'todo' | 'doing' | 'done' | 'bugs' }) => void
  mode: 'create' | 'edit'
  initialData?: Column
  darkMode: boolean
}

const ColumnForm = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
  darkMode,
}: ColumnFormProps) => {
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('bg-slate-500')
  const [category, setCategory] = useState<'todo' | 'doing' | 'done' | 'bugs'>('doing')

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title ?? '')
      setColor(initialData?.color ?? 'bg-slate-500')
      setCategory(initialData?.category ?? 'doing')
    }
  }, [isOpen, initialData])

  const colors = [
    'bg-slate-500',
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-fuchsia-500',
    'bg-rose-500',
  ]

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ title, color, category })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Column' : 'New Column'}
      darkMode={darkMode}
    >
      <form onSubmit={handleSubmit}>
        <InputGroup label="Column Title" value={title} onChange={setTitle} placeholder="e.g. In Review" />

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Column Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['doing', 'done', 'bugs'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-all ${category === cat
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-accent'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>


        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Color Tag
          </label>
          <div className="flex flex-wrap gap-3">
            {colors.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setColor(val)}
                className={`h-8 w-8 rounded-full transition-all ${val} ${color === val ? 'ring-2 ring-slate-400 ring-offset-2 dark:ring-slate-500 dark:ring-offset-slate-800' : 'hover:scale-110'}`}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Modal>
  )
}

type CardFormProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { title: string; description: string; priority: PriorityKey }) => void
  mode: 'create' | 'edit'
  initialData?: Card
  darkMode: boolean
}

const CardForm = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
  darkMode,
}: CardFormProps) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<PriorityKey>('medium')

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title ?? '')
      setDescription(initialData?.description ?? '')
      setPriority(initialData?.priority ?? 'medium')
    }
  }, [isOpen, initialData])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ title, description, priority })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Task' : 'New Task'}
      darkMode={darkMode}
    >
      <form onSubmit={handleSubmit}>
        <InputGroup label="Task Title" value={title} onChange={setTitle} placeholder="What needs to be done?" />
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
            Priority Level
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(PRIORITIES).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPriority(key as PriorityKey)}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs font-medium transition-all ${priority === key
                  ? `${cfg.color} border-transparent ring-1 ring-current`
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
              >
                {cfg.icon}
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
        <InputGroup
          label="Description"
          value={description}
          onChange={setDescription}
          type="textarea"
          placeholder="Add details, acceptance criteria, etc."
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save Task</Button>
        </div>
      </form>
    </Modal>
  )
}

export default App
