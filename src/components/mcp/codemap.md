# src/components/mcp/

## Responsibility
MCP-specific observability widgets for server health, status, and activity history.

## Design
- `McpStatusBadge` is a compact connectivity indicator for the header.
- `McpActivityLog` is a richer diagnostic panel with log filtering, metric summaries, and expand/collapse behavior.
- Both components are read-only views over status/metrics data fetched by hooks.

## Flow
1. Hooks poll the offline API for MCP status and metrics.
2. Layout components pass those values into the MCP widgets.
3. The widgets render current health and recent activity without mutating application state.

## Integration
- Consumed by header/layout chrome and any future observability surface.
- Depends on `src/types/` for `McpStatus`, `McpMetrics`, and `StorageMode`.
