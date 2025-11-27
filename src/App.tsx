import {
  Download,
  Edit2,
  Moon,
  Plus,
  Settings,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

const PRIORITIES = {
  low: {
    label: 'LOW',
    value: 1,
    color: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    ascii: '(-)',
  },
  medium: {
    label: 'MED',
    value: 2,
    color:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    ascii: '(o)',
  },
  high: {
    label: 'HGH',
    value: 3,
    color:
      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    ascii: '(!)',
  },
  critical: {
    label: 'CRT',
    value: 4,
    color:
      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    ascii: '(!!)',
  },
} as const

type PriorityKey = keyof typeof PRIORITIES

type Card = {
  id: string
  title: string
  description?: string
  priority: PriorityKey
}

type Column = {
  id: string
  title: string
  color: string
  cards: Card[]
}

type Board = {
  id: string
  title: string
  columns: Column[]
}

type ModalType =
  | 'createBoard'
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

const ASCIIBackground = ({ darkMode }: { darkMode: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let time = 0
    const chars = ['·', ',', '-', '~', '+', '*', '%', '&', '#', '@']

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const { width: w, height: h } = canvas
      ctx.fillStyle = darkMode ? '#020617' : '#f8fafc'
      ctx.fillRect(0, 0, w, h)

      const fontSize = 12
      const charWidth = fontSize * 0.6
      ctx.font = `${fontSize}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const cols = Math.ceil(w / charWidth)
      const rows = Math.ceil(h / fontSize)

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const posX = x * charWidth
          const posY = y * fontSize
          const noiseX = x * 0.12
          const noiseY = y * 0.12
          const val =
            Math.sin(noiseX + time * 0.5) +
            Math.cos(noiseY + time * 0.3) +
            Math.sin((noiseX + noiseY) * 0.5 + time)
          const normVal = (val + 3) / 6
          const isIsland = val > 0.8
          const isDeepSea = val < -1.5

          if (isDeepSea) continue

          let alpha = 0.15
          let color = darkMode ? '#475569' : '#cbd5e1'

          if (darkMode) {
            if (isIsland) {
              color = '#ffffff'
              alpha = Math.min((val - 0.5) * 0.9, 1)
            }
          } else if (isIsland) {
            color = '#64748b'
            alpha = 0.5
          }

          const charIndex = Math.floor(
            Math.max(0, Math.min(1, normVal)) * (chars.length - 1),
          )

          ctx.globalAlpha = alpha
          ctx.fillStyle = color
          ctx.fillText(chars[charIndex], posX, posY)
        }
      }

      time += 0.015
      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [darkMode])

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 h-full w-full -z-10 pointer-events-none transition-colors duration-500"
    />
  )
}

type ButtonProps = {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'danger' | 'ghost' | 'icon'
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
    'px-4 py-2 text-sm font-mono border transition-all duration-200 flex items-center gap-2 select-none disabled:opacity-50 disabled:cursor-not-allowed rounded-md'
  const variants: Record<string, string> = {
    primary:
      'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm',
    danger:
      'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40',
    ghost:
      'bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
    icon: 'p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md transform rounded-lg border border-slate-200 bg-white/95 p-6 shadow-xl transition-all dark:border-slate-700 dark:bg-slate-900/95 backdrop-blur-md ${darkMode ? 'dark' : ''}`}
      >
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
          <h2 className="flex items-center gap-2 text-lg font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
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
    <label className="mb-1 flex items-center justify-between text-xs font-mono uppercase text-slate-500 dark:text-slate-400">
      {label}
      {children}
    </label>
    {type === 'textarea' ? (
      <textarea
        className="w-full rounded border border-slate-200 bg-slate-50 p-2 font-sans text-slate-800 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-600 dark:focus:ring-slate-600"
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <input
        type="text"
        className="w-full rounded border border-slate-200 bg-slate-50 p-2 font-sans text-slate-800 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:placeholder:text-slate-600 dark:focus:ring-slate-600"
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
      title: 'Launch Project',
      columns: [
        {
          id: generateId(),
          title: 'To Do',
          color: 'border-l-4 border-l-slate-400',
          cards: [],
        },
        {
          id: generateId(),
          title: 'In Progress',
          color: 'border-l-4 border-l-blue-400',
          cards: [],
        },
        {
          id: generateId(),
          title: 'Done',
          color: 'border-l-4 border-l-green-400',
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
      if (targetIndex !== null) {
        targetCol.cards.splice(targetIndex, 0, movedCard)
      } else {
        targetCol.cards.push(movedCard)
      }
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

  return (
    <div
      className={`min-h-screen font-sans selection:bg-indigo-100 transition-colors duration-300 ${darkMode ? 'dark text-slate-100' : 'text-slate-800'}`}
    >
      <ASCIIBackground darkMode={darkMode} />

      <div className="mx-auto flex h-screen max-w-[1600px] flex-col p-6 md:p-8">
        <header className="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tighter">
              <span className="text-4xl text-blue-600 dark:text-blue-400">::</span> KANBAN_OS
            </h1>
            <p className="mt-1 pl-1 text-xs font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Local Productivity Environment
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDarkMode((prev) => !prev)} className="mr-2">
              {darkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
              {darkMode ? 'LIGHT' : 'DARK'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(boards))}`
                const anchor = document.createElement('a')
                anchor.href = dataStr
                anchor.download = 'kanban.json'
                anchor.click()
              }}
            >
              <Download size={14} /> SAVE
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
              <Button variant="ghost">
                <Upload size={14} /> LOAD
              </Button>
            </label>
          </div>
        </header>

        <div className="mb-8 flex gap-2 overflow-x-auto border-b border-slate-200/50 pb-2 dark:border-slate-700/50">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => setActiveBoardId(board.id)}
              className={`relative top-[1px] flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-mono transition-all ${
                activeBoardId === board.id
                  ? 'z-10 border border-slate-200 border-b-white bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:border-b-slate-900 dark:bg-slate-900 dark:text-slate-100'
                  : 'border border-transparent bg-slate-100/50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {activeBoardId === board.id ? (
                <span className="font-bold text-blue-500 dark:text-blue-400">&gt;</span>
              ) : (
                <span>#</span>
              )}
              {board.title}
              {activeBoardId === board.id && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleBoardDeletion(board.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleBoardDeletion(board.id)
                    }
                  }}
                  className="ml-2 rounded-full p-1 text-slate-400 transition-all hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                >
                  <X size={12} />
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setModal({ type: 'createBoard' })}
            className="rounded-md px-3 py-2 text-slate-400 transition-colors hover:bg-white/50 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-slate-800/50 dark:hover:text-blue-400"
          >
            <Plus size={18} />
          </button>
        </div>

        {activeBoard ? (
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full min-w-max gap-6 pb-4">
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
                  className="group flex h-full w-80 flex-col rounded-xl border border-slate-200/60 bg-white/60 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900/60 backdrop-blur-md"
                >
                  <div className={`flex cursor-grab items-center justify-between border-b border-b-slate-100 p-4 dark:border-b-slate-800 ${col.color}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold uppercase tracking-tight text-slate-700 dark:text-slate-200">
                        {col.title}
                      </span>
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        {col.cards.length}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() =>
                          setModal({ type: 'editColumn', data: { boardId: activeBoardId, col } })
                        }
                        className="p-1 text-slate-400 transition-colors hover:text-blue-500 dark:hover:text-blue-400"
                      >
                        <Settings size={14} />
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
                        className="p-1 text-slate-400 transition-colors hover:text-red-500 dark:hover:text-red-400"
                      >
                        <Trash2 size={14} />
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
                        className="group/card relative cursor-grab rounded-lg border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:ring-2 hover:ring-blue-400/20 dark:border-slate-700 dark:bg-slate-800 dark:hover:ring-blue-500/30"
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <span
                            className={`text-[10px] font-mono font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${PRIORITIES[card.priority]?.color ?? 'bg-slate-100 dark:bg-slate-800'} border-transparent`}
                          >
                            {PRIORITIES[card.priority]?.ascii}{' '}
                            {PRIORITIES[card.priority]?.label}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setModal({
                                type: 'editCard',
                                data: { boardId: activeBoardId, colId: col.id, card },
                              })
                            }}
                            className="opacity-0 transition-opacity group-hover/card:opacity-100 text-slate-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                        <h4 className="mb-1 font-semibold text-slate-800 dark:text-slate-100">
                          {card.title}
                        </h4>
                        {card.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {card.description}
                          </p>
                        )}
                        <div className="pointer-events-none absolute -right-2 -bottom-2 z-0 select-none text-[40px] font-mono font-black text-slate-50 opacity-30 dark:text-slate-700/20">
                          {idx < 9 ? `0${idx + 1}` : idx + 1}
                        </div>
                      </div>
                    ))}
                    {col.cards.length === 0 && (
                      <div className="flex h-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-100 text-xs font-mono text-slate-300 dark:border-slate-800 dark:text-slate-600">
                        <span>EMPTY</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 pt-0">
                    <button
                      type="button"
                      onClick={() => setModal({ type: 'createCard', data: { colId: col.id } })}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-transparent py-2 text-sm font-mono text-slate-500 transition-colors hover:border-slate-200 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <Plus size={14} /> NEW TASK
                    </button>
                  </div>
                </div>
              ))}

              <div className="h-full w-12 pt-4">
                <button
                  type="button"
                  onClick={() => setModal({ type: 'createColumn' })}
                  className="flex h-12 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/20 text-slate-400 shadow-sm transition-all hover:bg-white hover:text-blue-500 hover:shadow-md dark:border-slate-600 dark:bg-slate-800/20 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <div className="mb-4 text-6xl font-mono text-slate-200 dark:text-slate-800">
              _(:3」∠)_
            </div>
            <p>No Board Selected.</p>
            <Button className="mt-4" onClick={() => setModal({ type: 'createBoard' })}>
              CREATE BOARD
            </Button>
          </div>
        )}
      </div>

      <BoardForm
        isOpen={modal.type === 'createBoard'}
        onClose={() => setModal({ type: null })}
        darkMode={darkMode}
        onSubmit={({ title }) => {
          if (!title.trim()) return
          const newBoard: Board = { id: generateId(), title, columns: [] }
          setBoards((prev) => [...prev, newBoard])
          setActiveBoardId(newBoard.id)
          setModal({ type: null })
        }}
      />

      <ColumnForm
        isOpen={modal.type === 'createColumn' || modal.type === 'editColumn'}
        mode={modal.type === 'createColumn' ? 'create' : 'edit'}
        initialData={modal.data?.col as Column | undefined}
        onClose={() => setModal({ type: null })}
        darkMode={darkMode}
        onSubmit={({ title, color }) => {
          if (!activeBoardId || !title.trim()) return
          const currentModal = modal
          setBoards((prev) => {
            const next = deepClone(prev)
            const board = next.find((b) => b.id === activeBoardId)
            if (!board) return prev
            if (currentModal.type === 'createColumn') {
              board.columns.push({ id: generateId(), title, color, cards: [] })
            } else if (currentModal.type === 'editColumn') {
              const modalCol = currentModal.data?.col as Column | undefined
              const target = board.columns.find(
                (c) => c.id === modalCol?.id,
              )
              if (target) {
                target.title = title
                target.color = color
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
              col.cards.push({ id: generateId(), title, description, priority })
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
  darkMode: boolean
}

const BoardForm = ({ isOpen, onClose, onSubmit, darkMode }: BoardFormProps) => {
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!isOpen) setTitle('')
  }, [isOpen])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ title })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Project" darkMode={darkMode}>
      <form onSubmit={handleSubmit}>
        <InputGroup label="Name" value={title} onChange={setTitle} placeholder="Project Alpha" />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create</Button>
        </div>
      </form>
    </Modal>
  )
}

type ColumnFormProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { title: string; color: string }) => void
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
  const [color, setColor] = useState('border-l-4 border-l-slate-400')

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title ?? '')
      setColor(initialData?.color ?? 'border-l-4 border-l-slate-400')
    }
  }, [isOpen, initialData])

  const colors = [
    'border-l-4 border-l-slate-400',
    'border-l-4 border-l-blue-400',
    'border-l-4 border-l-emerald-400',
    'border-l-4 border-l-orange-400',
    'border-l-4 border-l-red-400',
    'border-l-4 border-l-violet-400',
  ]

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ title, color })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Column' : 'New Column'}
      darkMode={darkMode}
    >
      <form onSubmit={handleSubmit}>
        <InputGroup label="Title" value={title} onChange={setTitle} placeholder="e.g. Backlog" />
        <div className="mb-6">
          <label className="mb-2 block text-xs font-mono uppercase text-slate-500 dark:text-slate-400">
            Color
          </label>
          <div className="flex gap-2">
            {colors.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setColor(val)}
                className={`h-8 w-8 rounded-full border-2 ${val.replace('border-l-4', 'bg-white dark:bg-slate-700').replace('border-l-', 'border-')} ${color === val ? 'ring-2 ring-slate-400 dark:ring-slate-500' : 'border-transparent'}`}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
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
        <InputGroup label="Title" value={title} onChange={setTitle} placeholder="Task name" />
        <div className="mb-4">
          <label className="mb-1 block text-xs font-mono uppercase text-slate-500 dark:text-slate-400">
            Priority
          </label>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(PRIORITIES).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPriority(key as PriorityKey)}
                className={`rounded border px-3 py-2 text-xs font-mono transition-all ${
                  priority === key
                    ? `${cfg.color} border-current font-bold`
                    : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700'
                }`}
              >
                {cfg.ascii} {cfg.label}
              </button>
            ))}
          </div>
        </div>
        <InputGroup
          label="Description"
          value={description}
          onChange={setDescription}
          type="textarea"
          placeholder="Details..."
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  )
}

export default App

