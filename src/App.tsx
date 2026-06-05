import { useMemo, useState } from 'react'
import { Layout, Plus } from 'lucide-react'
import type { Board, Column, Card, ModalState, CommandPaletteAction } from './types'
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
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAgents } from './hooks/useAgents'
import { useDispatches } from './hooks/useDispatches'

const App = () => {
  const [modal, setModal] = useState<ModalState>({ type: null, data: null })
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [deletedCount, setDeletedCount] = useState(0)
  const [lastActivity, setLastActivity] = useState<number>(Date.now())

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
    clearColumnCards,
    undoCardDeletion,
    dropCard,
    toggleSubtask,
  } = useBoards([])

  const { storageMode, syncError } = useOfflineSync(boards, {
    onBoardsLoaded: (loadedBoards) => {
      importBoards(loadedBoards)
    },
    onActiveBoardUpdate: (updater) => {
      setActiveBoardId(updater(activeBoardId))
    },
    onLastActivity: () => setLastActivity(Date.now()),
    onSyncError: () => {},
  })

  const { darkMode, toggleTheme } = useTheme()
  const mcpStatus = useMcpStatus(storageMode)
  const agentsState = useAgents(storageMode)
  const dispatchState = useDispatches(storageMode)
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
      setModal({ type: null, data: null })
    },
  })

  // Helper: close modal and stop dispatch polling
  const closeModal = () => {
    dispatchState.stopPolling()
    setModal({ type: null, data: null })
  }

  // Helper: open edit card modal and load dispatches
  const openEditCard = (columnId: string, card: Card) => {
    setModal({ type: 'editCard', data: { colId: columnId, card } })
    if (storageMode === 'api') {
      void dispatchState.loadDispatchesForTask(card.id)
      dispatchState.startPolling(card.id)
    }
  }

  // Export / Import
  const handleExport = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(boards))}`
    const anchor = document.createElement('a')
    anchor.href = dataStr
    anchor.download = 'kanban.json'
    anchor.click()
  }

  const handleImport = (importedBoards: Board[]) => {
    importBoards(importedBoards)
  }

  // Deletion logic
  const handleUndoTaskDeletion = () => {
    if (!deletedTaskUndo) return
    undoCardDeletion(deletedTaskUndo.boardId, deletedTaskUndo.columnId, deletedTaskUndo.card, deletedTaskUndo.index)
    setDeletedTaskUndo(null)
    setDeletedCount((prev) => Math.max(0, prev - 1))
    setLastActivity(Date.now())
  }

  const handleDeleteConfirm = () => {
    if (modal.type !== 'deleteConfirm' || !modal.data) return
    const { type, id, parentId } = modal.data as { type: 'board' | 'column' | 'card' | 'columnCards'; id: string; parentId?: string }
    if (type === 'board') {
      deleteBoard(id)
    } else if (type === 'column') {
      deleteColumn(activeBoardId!, id)
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
      }
    } else if (type === 'columnCards') {
      clearColumnCards(activeBoardId!, id)
    }
    closeModal()
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
          action: () => openEditCard(col.id, card),
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
                      onEditCard={(columnId, card) => openEditCard(columnId, card)}
                      onCopyCard={() => {}}
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
                      onClearColumn={(columnId) => {
                        const c = activeBoard.columns.find((x) => x.id === columnId)
                        if (c && c.cards.length > 0) {
                          setModal({
                            type: 'deleteConfirm',
                            data: { type: 'columnCards', id: columnId, name: c.title, cardCount: c.cards.length },
                          })
                        }
                      }}
                      handleDragStart={handleDragStart}
                      handleDragEnd={handleDragEnd}
                      handleDropCard={(targetColId, targetIndex) => {
                        if (dragState.type === 'card' && dragState.sourceId && dragState.id) {
                          dropCard(activeBoard.id, dragState.sourceId, targetColId, dragState.id, targetIndex)
                          setLastActivity(Date.now())
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
        onClose={() => closeModal()}
        onSubmit={({ title }) => {
          if (!title.trim()) return
          if (modal.type === 'createBoard') {
            createBoard(title)
          } else if (modal.type === 'editBoard' && modal.data?.board) {
            const boardId = (modal.data.board as Board).id
            updateBoard(boardId, title)
          }
          closeModal()
          setLastActivity(Date.now())
        }}
      />

      <ColumnForm
        isOpen={modal.type === 'createColumn' || modal.type === 'editColumn'}
        mode={modal.type === 'createColumn' ? 'create' : 'edit'}
        initialData={modal.data?.col as Column | undefined}
        onClose={() => closeModal()}
        onSubmit={({ title, color, category }) => {
          if (!activeBoardId || !title.trim()) return
          if (modal.type === 'createColumn') {
            createColumn(activeBoardId, title, color, category)
          } else if (modal.type === 'editColumn' && modal.data?.col) {
            const colId = (modal.data.col as Column).id
            updateColumn(activeBoardId, colId, title, color, category)
          }
          closeModal()
          setLastActivity(Date.now())
        }}
      />

      <CardForm
        isOpen={modal.type === 'createCard' || modal.type === 'editCard'}
        mode={modal.type === 'createCard' ? 'create' : 'edit'}
        initialData={modal.data?.card as Card | undefined}
        onClose={closeModal}
        onSubmit={({ title, description, priority, subtasks }) => {
          if (!activeBoardId || !title.trim()) return
          const colId = modal.data?.colId as string | undefined
          if (!colId) return
          if (modal.type === 'createCard') {
            createCard(activeBoardId, colId, { title, description, priority, subtasks })
          } else if (modal.type === 'editCard' && modal.data?.card) {
            const cardId = (modal.data.card as Card).id
            updateCard(activeBoardId, colId, cardId, { title, description, priority, subtasks })
          }
          closeModal()
          setLastActivity(Date.now())
        }}
        agents={agentsState.agents}
        dispatches={
          modal.type === 'editCard' && modal.data?.card
            ? dispatchState.dispatchesByTaskId[(modal.data.card as Card).id] ?? []
            : []
        }
        dispatchLoading={dispatchState.loading}
        dispatchError={dispatchState.error}
        dispatchDisabled={storageMode !== 'api'}
        onCreateDispatch={async ({ taskId, agentId, prompt }) => {
          if (!activeBoardId) return
          await dispatchState.createDispatch({
            boardId: activeBoardId,
            taskId,
            agentId,
            prompt,
            author: 'user',
          })
          setLastActivity(Date.now())
        }}
        onCancelDispatch={async (dispatchId) => {
          await dispatchState.cancelDispatch(dispatchId)
          if (modal.type === 'editCard' && modal.data?.card) {
            void dispatchState.loadDispatchesForTask((modal.data.card as Card).id)
          }
        }}
        onRefreshDispatches={(taskId) => {
          void dispatchState.loadDispatchesForTask(taskId)
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirm
        isOpen={modal.type === 'deleteConfirm'}
        onClose={() => closeModal()}
        onConfirm={handleDeleteConfirm}
        type={(modal.data?.type as 'board' | 'column' | 'card' | 'columnCards') ?? 'card'}
        itemName={modal.data?.name as string ?? ''}
        cardCount={modal.data?.cardCount as number | undefined}
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
