# src/components/layout/

## Responsibility
Top-level shell components: header, sidebar, and toolbar.

## Design
- `Header` is the command-and-status strip for persistence mode, import/export, theme switching, and MCP connectivity.
- `Sidebar` is a collapsible container for the statistics panel.
- `Toolbar` is the filter and sort control surface for the active board.

## Flow
1. `App.tsx` provides board state, callbacks, and status values to the layout components.
2. `Header` performs import/export and triggers theme toggling.
3. `Sidebar` renders `ProjectStatistics` or a collapsed icon rail.
4. `Toolbar` pushes search/filter/sort changes back into `useFilters`.

## Integration
- Tightly coupled to `src/hooks/` state and `src/components/stats/ProjectStatistics.tsx`.
- Imports board/domain types and UI primitives from `src/components/ui/`.
