# KanbanBoard

React/Vite Kanban board with an optional local offline backend and MCP server.

## Start

```bash
npm install
npm run dev:offline
```

Open `http://127.0.0.1:4173/`.

`dev:offline` starts:

- the Kanban offline API at `http://127.0.0.1:4174`
- the Kanban MCP HTTP server at `http://127.0.0.1:4175/mcp`
- the Vite app at `http://127.0.0.1:4173`

The offline API stores live board data in `data/kanban.json`. That file is intentionally ignored by Git so your local tasks stay local.

## MCP

Start the HTTP MCP server with:

```bash
npm run mcp:http
```

Codex is configured to connect to:

```toml
[mcp_servers.kanban-board]
url = "http://127.0.0.1:4175/mcp"
```

The stdio server is still available with `npm run mcp` for MCP clients that launch local commands.

Available MCP tools include reading the full board state, listing boards, creating/updating/deleting boards, columns, tasks and subtasks, moving tasks, toggling subtasks, searching tasks, and replacing the full state for imports or migrations.

When the HTTP MCP server is running, the board header shows `MCP Connected`. If it is not running yet, it shows `MCP Offline`.

## Browser-only fallback

`npm run dev` still starts only Vite. If the offline API is not reachable, the app falls back to browser `localStorage`, so the GitHub Pages build remains usable without a local server.

## Checks

```bash
npm run build
npm audit --audit-level=moderate
```
