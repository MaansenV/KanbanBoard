# src/components/

## Responsibility
Reusable React view layer, split by feature area so board logic, layout chrome, modals, statistics, MCP indicators, and primitives stay isolated.

## Design
- Feature folders group together the components they own: `board/`, `layout/`, `modals/`, `stats/`, `mcp/`, and `ui/`.
- Most components are presentational and receive all state/handlers via props.
- Stateful UI concerns are kept local to the smallest component that needs them, e.g. command palette search, dropdown focus, sidebar collapse, and tooltip visibility.

## Flow
1. `App.tsx` renders layout chrome (`Header`, `Sidebar`, `Toolbar`) and the active board viewport.
2. Layout components delegate into feature-specific components such as `BoardTabs`, `Column`, `Card`, and modal forms.
3. Stats/MCP components render read-only summaries from hook-provided data.
4. UI primitives (`Button`, `Modal`, `CustomDropdown`, etc.) provide consistent styling and behavior across the feature tree.

## Integration
- `src/components/board/` is the rendering target for the filtered/deduplicated board view model.
- `src/components/layout/` consumes application-level state and routes user intent back to `App.tsx` callbacks.
- `src/components/modals/` mutates boards/columns/cards through submit handlers.
- `src/components/ui/` is used throughout the tree as the shared design system.
