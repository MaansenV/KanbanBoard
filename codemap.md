# Repository Atlas: KanbanBoard

## Responsibility
Single-page Kanban board application with a React/Tailwind UI, local-first persistence, and an optional offline API + MCP server stack for Codex/local tooling.

## System Entry Points
- `src/main.tsx` mounts the React root.
- `src/App.tsx` composes the board shell, filters, modals, and drag-and-drop actions.
- `server/dev-offline.mjs` starts the offline API, MCP HTTP server, and Vite dev server together.
- `server/offline-server.mjs` exposes the local REST state API used by the browser app.
- `server/mcp-http-server.mjs` and `server/mcp-server.mjs` expose the MCP transport layer.
- `package.json` defines the runtime scripts and project dependencies.

## Directory Map
| Path | Responsibility | Detailed Map |
|---|---|---|
| `src/` | Application composition, domain types, hooks, utilities, and UI components. | [src/codemap.md](src/codemap.md) |
| `src/components/` | Feature UI split into board, layout, modal, stats, MCP, and primitive subtrees. | [src/components/codemap.md](src/components/codemap.md) |
| `src/hooks/` | State orchestration and cross-cutting client behavior (offline sync, filters, drag/drop, theme, shortcuts). | [src/hooks/codemap.md](src/hooks/codemap.md) |
| `src/types/` | Shared domain and UI model definitions. | [src/types/codemap.md](src/types/codemap.md) |
| `src/utils/` | Shared helpers, merge logic, ID generation, and API constants. | [src/utils/codemap.md](src/utils/codemap.md) |
| `server/` | Offline data store, REST API, MCP core, and local transport runners. | [server/codemap.md](server/codemap.md) |

## Review Notes
- `src/components/stats/ProjectStatistics.tsx` is the canonical statistics panel.
- `src/ProjectStatistics.tsx` remains in the tree as a legacy duplicate/shim and should be reviewed for eventual removal or consolidation.
