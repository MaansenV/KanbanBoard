# src/components/board/

## Responsibility
Primary Kanban board viewport: project tabs, column lanes, draggable cards, and subtask rendering.

## Design
- `BoardTabs` manages board selection and board-level actions.
- `Column` acts as a droppable lane and renders a filtered/sorted `VisibleColumn` view model.
- `Card` owns per-task affordances such as editing, copy-to-clipboard, fold/unfold, delete, and subtask progress.
- `SubtaskList` is a narrow presentation component for checklist toggles.

## Flow
1. `App.tsx` renders `BoardTabs` above the active board.
2. `useFilters` produces `VisibleColumn[]`, which are passed into `Column`.
3. `Column` forwards card-level events to `Card`, which in turn invokes parent callbacks for edit/delete/toggle interactions.
4. Drag-and-drop events are bubbled up through `useDragAndDrop` and `useBoards` mutations.

## Integration
- Consumes `VisibleColumn`, `Card`, `Column`, `Subtask`, and `Board` types.
- Depends on callback props from `App.tsx` for persistence and modal orchestration.
