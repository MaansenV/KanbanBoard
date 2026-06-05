# server/

## Responsibility
Local persistence, offline API, and MCP transport stack for the Kanban board.

## Design
- `kanban-store.mjs` is the canonical state store and normalization layer for boards, cards, MCP status, and metrics.
- `dispatch-store.mjs` manages agent registration and task dispatch persistence (separate from board state).
- `offline-server.mjs` exposes a small REST surface over the store for the browser app.
- `mcp-core.mjs` contains the JSON-RPC tool definitions and dispatch logic shared by the HTTP and stdio servers.
- `mcp-http-server.mjs` and `mcp-server.mjs` are thin transport adapters over the shared MCP core.
- `dev-offline.mjs` is the process supervisor used during local development.

## Flow
1. The browser app reads and writes `/api/state` through the offline server.
2. Writes are normalized and versioned in `kanban-store.mjs`; stale writes can return a 409 conflict for client-side merge handling.
3. MCP clients call the HTTP or stdio transport, which forwards JSON-RPC messages into `mcp-core.mjs` and the same underlying store.
4. Both MCP servers emit heartbeat files so the UI can detect connection status.
5. Agent dispatches flow through `dispatch-store.mjs` with separate `data/agents.json` and `data/dispatches.json` files.
6. The REST API exposes `/api/agents` and `/api/dispatches` endpoints for the UI dispatch panel.

## Integration
- Consumed by `src/hooks/useOfflineSync.ts`, `src/hooks/useMcpStatus.ts`, `src/hooks/useMcpMetrics.ts`.
- Consumed by `src/hooks/useAgents.ts` and `src/hooks/useDispatches.ts` for agent dispatch UI.
- Consumed by Codex or other MCP clients via the HTTP endpoint or stdio transport.

## Review Notes
- Test files exist in this folder, but the codemap intentionally focuses on runtime modules rather than test fixtures.
