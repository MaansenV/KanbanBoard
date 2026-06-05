# src/hooks/

## Responsibility
Client-side state orchestration and cross-cutting behaviors for the Kanban board UI.

## Design
- Hooks are narrowly scoped and composable; each hook owns one concern and exposes a small API.
- `useBoards` is the in-memory source of truth for board CRUD and drag/drop mutations.
- `useOfflineSync` bridges in-memory board state with the offline REST API or browser localStorage, including conflict merging.
- `useAgents` and `useDispatches` manage agent registration and task dispatch lifecycle via the REST API.
- Ancillary hooks manage theme, keyboard shortcuts, filters, fold state, undo deletion, and MCP metadata polling.

## Flow
1. `App.tsx` initializes `useBoards([])` and passes the resulting board state into downstream hooks.
2. `useOfflineSync` hydrates board state from the remote API or localStorage and persists subsequent edits back to the chosen store.
3. `useFilters` derives the visible board/column/card model used by the board viewport.
4. Interaction hooks (`useDragAndDrop`, `useKeyboardShortcuts`, `useFoldedTasks`, `useUndoDelete`, `useTheme`) mutate local UI state in response to user actions.
5. `useMcpStatus` and `useMcpMetrics` poll the offline API for MCP health and usage telemetry.
6. `useAgents` polls agent state; `useDispatches` manages dispatch creation, polling, and cancellation.

## Integration
- Consumed directly by `src/App.tsx` and layout/board components.
- Depends on `src/utils/helpers.ts` for API base URL, cloning, and fetch timeout behavior.
- Depends on `src/utils/merge.ts` for conflict resolution during offline sync.
