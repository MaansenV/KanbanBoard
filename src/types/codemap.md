# src/types/

## Responsibility
Shared domain model for boards, columns, cards, subtasks, UI state, filter state, MCP telemetry, and command palette actions.

## Design
- Type aliases define the canonical priority/category/value domains used across UI and server code.
- Board data is represented as a nested aggregate: `Board -> Column -> Card -> Subtask/TaskNote`.
- UI-specific view models (`VisibleCard`, `VisibleColumn`, `DeletedTaskSnapshot`, `ModalState`, `DragState`) live beside domain entities so hooks and components can share the same shapes.
- Constants such as `PRIORITIES`, `CATEGORY_LABELS`, and `SORT_LABELS` centralize label/value mapping for the entire app.

## Flow
1. Components and hooks import these types to ensure board state and callbacks stay aligned.
2. `useBoards`, `useFilters`, and modal forms use the types to validate and shape user edits.
3. MCP status/metrics types mirror the JSON payloads returned by the offline API.

## Integration
- Consumed by nearly every file under `src/components/`, `src/hooks/`, and `src/utils/`.
- Provides the shared contract between the React app and the offline API payloads.
