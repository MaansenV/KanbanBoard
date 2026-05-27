import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Layout, Plus } from 'lucide-react'
import type { Board, Column, Card, ModalState, CommandPaletteAction } from './types'
import type { LogEntry } from './components/mcp/McpActivityLog'
import { PRIORITIES } from './types'
import { Button } from './components/ui/Button'
import { UndoToast } from './components/ui/Toast'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { BoardTabs } from './components/board/BoardTabs'
import { Toolbar } from './components/layout/Toolbar'
import { Column as BoardColumn } from './components/board/Column'
import { BoardForm } from './components/modals/BoardForm'
import { ColumnForm } from './components/modals/ColumnForm'
import { CardForm } from './components/modals/CardForm'
import { CommandPalette } from './components/modals/CommandPalette'
import { DeleteConfirm } from './components/modals/DeleteConfirm'
import { useBoards } from './hooks/useBoards'
import { useOfflineSync } from './hooks/useOfflineSync'
import { useTheme } from './hooks/useTheme'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { useFilters } from './hooks/useFilters'
import { useUndoDelete } from './hooks/useUndoDelete'
import { useFoldedTasks } from './hooks/useFoldedTasks'
import { useMcpStatus } from './hooks/useMcpStatus'
import { useMcpMetrics } from './hooks/useMcpMetrics'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { generateId } from './utils/helpers'

const App = () => {
  const [modal, setModal] = useState<ModalState>({ type: null, data: null })
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [deletedCount, setDeletedCount] = useState(0)
  const [lastActivity, setLastActivity] = useState<number>(Date.now())

  // Developer activity log stream
  const [logs, setLogs] = useState<LogEntry[]>(() => [
    {
      id: 'init-1',
      timestamp: Date.now() - 15000,
      type: 'info',
      title: 'Kanban Client gestartet',
      message: 'UI bereit, Persistenz wird geprueft.',
      meta: { source: 'app' },
    },
    {
      id: 'init-2',
      timestamp: Date.now() - 12000,
      type: 'sync',
      title: 'Persistenz initialisiert',
      message: 'Warte auf Offline API und MCP Heartbeat.',
      meta: { source: 'storage' },
    },
  ])

  const addLog = useCallback((type: LogEntry['type'], message: string, details?: Omit<LogEntry, 'id' | 'timestamp' | 'type' | 'message'>) => {
    setLogs((prev) => [
      ...prev.slice(-119),
      {
        id: generateId(),
        timestamp: Date.now(),
        type,
        message,
        ...details,
      },
    ])
  }, [])

  // Custom Hooks
  const {
    boards,
    activeBoardId,
    setActiveBoardId,
    activeBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    importBoards,
    createColumn,
    updateColumn,
    deleteColumn,
    dropColumn,
    createCard,
    updateCard,
    deleteCard,
    undoCardDeletion,
    dropCard,
    toggleSubtask,
  } = useBoards([])

  const { storageMode, syncError } = useOfflineSync(boards, {
    onBoardsLoaded: (loadedBoards) => {
      importBoards(loadedBoards)
      const taskCount = loadedBoards.reduce(
        (sum, board) => sum + board.columns.reduce((columnSum, column) => columnSum + column.cards.length, 0),
        0,
      )
      addLog('sync', `${loadedBoards.length} Boards, ${taskCount} Aufgaben geladen.`, {
        title: 'Boards aus Offline API geladen',
        meta: { boards: loadedBoards.length, tasks: taskCount },
      })
    },
    onActiveBoardUpdate: (updater) => {
      setActiveBoardId(updater(activeBoardId))
    },
    onLastActivity: () => setLastActivity(Date.now()),
    onSyncError: (err) => {
      if (err) {
        addLog('error', err, {
          title: 'Synchronisation fehlgeschlagen',
          meta: { mode: storageMode },
        })
      } else {
        addLog('success', 'Board-State wurde gespeichert.', {
          title: 'Synchronisation abgeschlossen',
          meta: { boards: boards.length },
        })
      }
    },
  })

  const { darkMode, toggleTheme } = useTheme()
  const mcpStatus = useMcpStatus(storageMode)
  const mcpMetrics = useMcpMetrics(storageMode)
  const previousMcpConnected = useRef<boolean | null>(null)
  const previousStorageMode = useRef<string | null>(null)
  const { dragState, handleDragStart, handleDragEnd } = useDragAndDrop()
  const { deletedTaskUndo, setDeletedTaskUndo } = useUndoDelete()
  const { foldedTaskIds, toggleFold } = useFoldedTasks()

  const {
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    categoryFilter,
    setCategoryFilter,
    sortMode,
    setSortMode,
    visibleColumns,
    visibleTaskCount,
    totalTaskCount,
    hasActiveFilters,
    clearFilters,
  } = useFilters(activeBoard)

  useEffect(() => {
    if (previousStorageMode.current === storageMode) return
    previousStorageMode.current = storageMode

    const labels = {
      loading: 'Initialisierung',
      api: 'Offline API',
      local: 'Browser LocalStorage',
    }
    addLog(storageMode === 'api' ? 'success' : storageMode === 'local' ? 'warning' : 'info', `Speichermodus: ${labels[storageMode]}.`, {
      title: 'Storage Modus gewechselt',
      meta: { mode: storageMode },
    })
  }, [addLog, storageMode])

  useEffect(() => {
    if (storageMode !== 'api' || !mcpStatus) return
    const isConnected = Boolean(mcpStatus.connected)
    if (previousMcpConnected.current === isConnected) return
    previousMcpConnected.current = isConnected

    addLog(isConnected ? 'success' : 'warning', isConnected ? 'MCP Heartbeat empfangen.' : 'Kein aktueller MCP Heartbeat.', {
      title: isConnected ? 'MCP verbunden' : 'MCP offline',
      details: [
        `PID: ${mcpStatus.pid ?? 'unbekannt'}`,
        `Heartbeat Alter: ${Number.isFinite(mcpStatus.ageMs) ? `${Math.round((mcpStatus.ageMs ?? 0) / 1000)}s` : 'unbekannt'}`,
        `Datenquelle: ${mcpStatus.dataFile ?? 'unbekannt'}`,
      ],
      meta: { pid: mcpStatus.pid, connected: isConnected },
    })
  }, [addLog, mcpStatus, storageMode])

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    onCommandPalette: () => setIsCommandPaletteOpen(true),
    onNewCard: () => {
      if (activeBoard && activeBoard.columns.length > 0) {
        setModal({ type: 'createCard', data: { colId: activeBoard.columns[0].id } })
      }
    },
    onToggleTheme: toggleTheme,
    onEscape: () => {
      setIsCommandPaletteOpen(false)
      setModal({ type: null })
    },
  })

  // Export / Import
  const handleExport = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(boards))}`
    const anchor = document.createElement('a')
    anchor.href = dataStr
    anchor.download = 'kanban.json'
    anchor.click()
    const taskCount = boards.reduce(
      (sum, board) => sum + board.columns.reduce((columnSum, column) => columnSum + column.cards.length, 0),
      0,
    )
    addLog('info', 'Kanban-Daten als JSON heruntergeladen.', {
      title: 'Export erstellt',
      meta: { boards: boards.length, tasks: taskCount },
    })
  }

  const handleImport = (importedBoards: Board[]) => {
    importBoards(importedBoards)
    const taskCount = importedBoards.reduce(
      (sum, board) => sum + board.columns.reduce((columnSum, column) => columnSum + column.cards.length, 0),
      0,
    )
    addLog('success', `${importedBoards.length} Projekte importiert.`, {
      title: 'Import abgeschlossen',
      meta: { boards: importedBoards.length, tasks: taskCount },
    })
  }

  // Deletion logic
  const handleUndoTaskDeletion = () => {
    if (!deletedTaskUndo) return
    undoCardDeletion(deletedTaskUndo.boardId, deletedTaskUndo.columnId, deletedTaskUndo.card, deletedTaskUndo.index)
    setDeletedTaskUndo(null)
    setDeletedCount((prev) => Math.max(0, prev - 1))
    setLastActivity(Date.now())
    addLog('success', `Gelöschte Aufgabe "${deletedTaskUndo.card.title}" wiederhergestellt.`)
  }

  const handleDeleteConfirm = () => {
    if (modal.type !== 'deleteConfirm' || !modal.data) return
    const { type, id, parentId } = modal.data as { type: 'board' | 'column' | 'card'; id: string; parentId?: string }
    if (type === 'board') {
      deleteBoard(id)
      addLog('warning', 'Projekt gelöscht.')
    } else if (type === 'column') {
      deleteColumn(activeBoardId!, id)
      addLog('warning', 'Spalte gelöscht.')
    } else if (type === 'card') {
      const deletedInfo = deleteCard(activeBoardId!, parentId!, id)
      if (deletedInfo) {
        setDeletedTaskUndo({
          boardId: activeBoardId!,
          columnId: parentId!,
          card: deletedInfo.card,
          index: deletedInfo.index,
          deletedAt: Date.now(),
        })
        setDeletedCount((prev) => prev + 1)
        addLog('warning', `Aufgabe "${deletedInfo.card.title}" gelöscht.`)
      }
    }
    setModal({ type: null })
    setLastActivity(Date.now())
  }

  // Command Palette Actions
  const commandPaletteActions = useMemo<CommandPaletteAction[]>(() => {
    const list: CommandPaletteAction[] = []

    // Switch projects
    boards.forEach((b) => {
      list.push({
        id: `switch-board-${b.id}`,
        label: `Projekt: ${b.title}`,
        description: 'Zu diesem Projekt wechseln',
        category: 'board',
        action: () => setActiveBoardId(b.id),
      })
    })

    // Actions
    list.push({
      id: 'action-create-board',
      label: 'Neues Projekt erstellen',
      description: 'Ein leeres Projekt anlegen',
      category: 'aktion',
      action: () => setModal({ type: 'createBoard' }),
    })

    if (activeBoardId) {
      list.push({
        id: 'action-create-column',
        label: 'Neue Spalte hinzufügen',
        description: 'Eine neue Spalte zum aktuellen Projekt hinzufügen',
        category: 'aktion',
        action: () => setModal({ type: 'createColumn' }),
      })
      if (activeBoard?.columns.length) {
        list.push({
          id: 'action-create-card',
          label: 'Neue Aufgabe erstellen',
          description: 'Eine Aufgabe zur ersten Spalte hinzufügen',
          category: 'aktion',
          action: () => setModal({ type: 'createCard', data: { colId: activeBoard.columns[0].id } }),
        })
      }
    }

    list.push({
      id: 'action-toggle-theme',
      label: 'Farbschema wechseln',
      description: 'Zwischen hellem und dunklem Design umschalten',
      category: 'aktion',
      action: toggleTheme,
    })

    list.push({
      id: 'action-clear-filters',
      label: 'Filter zurücksetzen',
      description: 'Alle Such- und Filterkriterien zurücksetzen',
      category: 'aktion',
      action: clearFilters,
    })

    list.push({
      id: 'action-export-data',
      label: 'Daten exportieren',
      description: 'Kanban-Daten als JSON-Datei herunterladen',
      category: 'aktion',
      action: handleExport,
    })

    // Tasks from active board
    activeBoard?.columns.forEach((col) => {
      col.cards.forEach((card) => {
        list.push({
          id: `task-${card.id}`,
          label: `Aufgabe: ${card.title}`,
          description: `In Spalte "${col.title}" · Priorität: ${PRIORITIES[card.priority]?.label}`,
          category: 'task',
          action: () => setModal({ type: 'editCard', data: { colId: col.id, card } }),
        })
      })
    })

    return list
  }, [boards, activeBoardId, activeBoard, toggleTheme, clearFilters])
  return (
    <div className={`relative z-10 min-h-screen font-sans transition-colors duration-700 ${darkMode ? 'dark' : ''}`}>
      <div className="fixed inset-0 -z-10 bg-background transition-colors duration-700" />
      <div
        className={`fixed inset-0 -z-10 bg-mesh-light transition-opacity duration-700 ${
          darkMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      />
      <div
        className={`fixed inset-0 -z-10 bg-mesh transition-opacity duration-700 ${
          darkMode ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div className="fixed inset-0 -z-10 bg-dot-grid opacity-50 pointer-events-none transition-opacity duration-700" />

      <div className="mx-auto flex h-screen max-w-[1800px] flex-col p-4 md:p-6 lg:p-8">
        <Header
          storageMode={storageMode}
          syncError={syncError}
          mcpStatus={mcpStatus}
          darkMode={darkMode}
          boards={boards}
          onToggleTheme={toggleTheme}
          onExport={handleExport}
          onImport={handleImport}
        />

        <div className="flex flex-1 gap-6 overflow-hidden">
          <Sidebar
            board={activeBoard}
            deletedCount={deletedCount}
            lastActivity={lastActivity}
            logs={logs}
            mcpStatus={mcpStatus}
            mcpMetrics={mcpMetrics}
            storageMode={storageMode}
            syncError={syncError}
            onClearLogs={() => setLogs([])}
          />

          <div className="flex flex-1 flex-col overflow-hidden">
            <BoardTabs
              boards={boards}
              activeBoardId={activeBoardId}
              setActiveBoardId={setActiveBoardId}
              onEditBoard={(b) => setModal({ type: 'editBoard', data: { board: b } })}
              onDeleteBoard={(boardId) => {
                const b = boards.find((x) => x.id === boardId)
                if (b) {
                  setModal({
                    type: 'deleteConfirm',
                    data: { type: 'board', id: boardId, name: b.title },
                  })
                }
              }}
              onAddBoard={() => setModal({ type: 'createBoard' })}
            />

            {activeBoard && (
              <Toolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                priorityFilter={priorityFilter}
                onPriorityChange={setPriorityFilter}
                categoryFilter={categoryFilter}
                onCategoryChange={setCategoryFilter}
                sortMode={sortMode}
                onSortChange={setSortMode}
                visibleCount={visibleTaskCount}
                totalCount={totalTaskCount}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
              />
            )}

            {activeBoard ? (
              <div className="flex-1 overflow-x-auto overflow-y-hidden rounded-3xl glass-panel p-6 custom-scrollbar">
                <div className="flex h-full min-w-max gap-6">
                  {visibleColumns.map((col) => (
                    <BoardColumn
                      key={col.id}
                      column={col}
                      hasActiveFilters={hasActiveFilters}
                      foldedTaskIds={foldedTaskIds}
                      onFoldToggle={toggleFold}
                      onEditCard={(columnId, card) => setModal({ type: 'editCard', data: { colId: columnId, card } })}
                      onCopyCard={() => {
                        addLog('success', 'Aufgabe in die Zwischenablage kopiert.')
                      }}
                      onDeleteCard={(columnId, cardId) => {
                        const c = activeBoard.columns.find((x) => x.id === columnId)
                        const card = c?.cards.find((x) => x.id === cardId)
                        if (card) {
                          setModal({
                            type: 'deleteConfirm',
                            data: { type: 'card', id: cardId, name: card.title, parentId: columnId },
                          })
                        }
                      }}
                      onSubtaskToggle={(columnId, cardId, subtaskId) => {
                        toggleSubtask(activeBoard.id, columnId, cardId, subtaskId)
                        setLastActivity(Date.now())
                      }}
                      onAddCard={(columnId) => setModal({ type: 'createCard', data: { colId: columnId } })}
                      onEditColumn={(column) => setModal({ type: 'editColumn', data: { col: column } })}
                      onDeleteColumn={(columnId) => {
                        const c = activeBoard.columns.find((x) => x.id === columnId)
                        if (c) {
                          setModal({
                            type: 'deleteConfirm',
                            data: { type: 'column', id: columnId, name: c.title },
                          })
                        }
                      }}
                      handleDragStart={handleDragStart}
                      handleDragEnd={handleDragEnd}
                      handleDropCard={(targetColId, targetIndex) => {
                        if (dragState.type === 'card' && dragState.sourceId && dragState.id) {
                          dropCard(activeBoard.id, dragState.sourceId, targetColId, dragState.id, targetIndex)
                          setLastActivity(Date.now())
                          addLog(
                            'info',
                            `Aufgabe verschoben nach ${activeBoard.columns.find((c) => c.id === targetColId)?.title}`,
                          )
                        }
                      }}
                      handleDropColumn={(targetColId) => {
                        if (dragState.type === 'column' && dragState.id) {
                          dropColumn(activeBoard.id, dragState.id, targetColId)
                          setLastActivity(Date.now())
                        }
                      }}
                    />
                  ))}

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => setModal({ type: 'createColumn' })}
                      className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/30 text-muted-foreground transition-all hover:border-primary hover:bg-background hover:text-primary hover:shadow-lg"
                      title="Spalte hinzufügen"
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
                <h2 className="mb-2 text-xl font-bold text-foreground">Kein Projekt ausgewählt</h2>
                <p className="mb-6 max-w-xs text-center text-sm">
                  Erstelle ein neues Projekt, um mit der Arbeit an deinen Aufgaben zu beginnen.
                </p>
                <Button onClick={() => setModal({ type: 'createBoard' })}>
                  <Plus size={16} /> Projekt erstellen
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Board Modals */}
      <BoardForm
        isOpen={modal.type === 'createBoard' || modal.type === 'editBoard'}
        mode={modal.type === 'createBoard' ? 'create' : 'edit'}
        initialData={modal.data?.board as Board | undefined}
        onClose={() => setModal({ type: null })}
        onSubmit={({ title }) => {
          if (!title.trim()) return
          if (modal.type === 'createBoard') {
            createBoard(title)
            addLog('success', `Projekt "${title}" erstellt.`)
          } else if (modal.type === 'editBoard' && modal.data?.board) {
            const boardId = (modal.data.board as Board).id
            updateBoard(boardId, title)
            addLog('info', `Projekt in "${title}" umbenannt.`)
          }
          setModal({ type: null })
          setLastActivity(Date.now())
        }}
      />

      <ColumnForm
        isOpen={modal.type === 'createColumn' || modal.type === 'editColumn'}
        mode={modal.type === 'createColumn' ? 'create' : 'edit'}
        initialData={modal.data?.col as Column | undefined}
        onClose={() => setModal({ type: null })}
        onSubmit={({ title, color, category }) => {
          if (!activeBoardId || !title.trim()) return
          if (modal.type === 'createColumn') {
            createColumn(activeBoardId, title, color, category)
            addLog('success', `Spalte "${title}" erstellt.`)
          } else if (modal.type === 'editColumn' && modal.data?.col) {
            const colId = (modal.data.col as Column).id
            updateColumn(activeBoardId, colId, title, color, category)
            addLog('info', `Spalte "${title}" aktualisiert.`)
          }
          setModal({ type: null })
          setLastActivity(Date.now())
        }}
      />

      <CardForm
        isOpen={modal.type === 'createCard' || modal.type === 'editCard'}
        mode={modal.type === 'createCard' ? 'create' : 'edit'}
        initialData={modal.data?.card as Card | undefined}
        onClose={() => setModal({ type: null })}
        onSubmit={({ title, description, priority, subtasks }) => {
          if (!activeBoardId || !title.trim()) return
          const colId = modal.data?.colId as string | undefined
          if (!colId) return
          if (modal.type === 'createCard') {
            createCard(activeBoardId, colId, { title, description, priority, subtasks })
            addLog('success', `Aufgabe "${title}" erstellt.`)
          } else if (modal.type === 'editCard' && modal.data?.card) {
            const cardId = (modal.data.card as Card).id
            updateCard(activeBoardId, colId, cardId, { title, description, priority, subtasks })
            addLog('info', `Aufgabe "${title}" aktualisiert.`)
          }
          setModal({ type: null })
          setLastActivity(Date.now())
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirm
        isOpen={modal.type === 'deleteConfirm'}
        onClose={() => setModal({ type: null })}
        onConfirm={handleDeleteConfirm}
        type={(modal.data?.type as 'board' | 'column' | 'card') ?? 'card'}
        itemName={modal.data?.name as string ?? ''}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        actions={commandPaletteActions}
      />

      {/* Undo Toast */}
      {deletedTaskUndo && (
        <UndoToast
          deletedTask={deletedTaskUndo}
          onUndo={handleUndoTaskDeletion}
          onDismiss={() => setDeletedTaskUndo(null)}
        />
      )}
    </div>
  )
}

export default App
