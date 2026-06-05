# src/

## Responsibility
Client application layer for the Kanban board. This folder owns React bootstrapping, top-level composition, shared types, client hooks, and reusable helpers used by the UI.

## Design
- Composition root in `App.tsx` wires independent hooks into a single page shell.
- State is split by concern: board CRUD (`useBoards`), remote/local persistence (`useOfflineSync`), filters/sorting (`useFilters`), UI preferences (`useTheme`, `useFoldedTasks`), interaction helpers (`useDragAndDrop`, `useKeyboardShortcuts`), and agent dispatch (`useAgents`, `useDispatches`).
- Shared domain models live in `types/` and are consumed by both components and hooks.
- `src/components/stats/ProjectStatistics.tsx` is the canonical stats panel; `src/ProjectStatistics.tsx` is a legacy duplicate that should be treated as review-only.
- `src/components/dispatch/DispatchPanel.tsx` renders the agent dispatch UI within the task modal.

## Flow
1. `main.tsx` mounts `App` into `#root` and imports global styles.
2. `App.tsx` creates board state, modal state, filter state, theme state, drag state, undo state, MCP connectivity state, and agent dispatch state.
3. `useOfflineSync` loads board data from the offline API if available; otherwise it falls back to localStorage and a demo board.
4. User actions flow from layout/board/modal components back into hook callbacks, which mutate board state and trigger sync.
5. `useFilters` derives the visible board/column/card view model that is rendered by the board subtree.
6. Agent dispatches flow through `useAgents`/`useDispatches` hooks to the REST API and back.

## Integration
- Consumes `src/components/**` for UI rendering.
- Consumes `src/utils/helpers.ts` and `src/utils/merge.ts` for client-side API, cloning, and merge logic.
- Integrates with `server/offline-server.mjs` via `/api/state`, `/api/health`, `/api/mcp-status`, `/api/mcp-metrics`, `/api/agents`, and `/api/dispatches`.
- Integrates with the MCP layer indirectly through status/metrics endpoints.
