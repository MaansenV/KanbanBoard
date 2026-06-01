# src/components/stats/

## Responsibility
Derived analytics panel for the active board.

## Design
- `ProjectStatistics` computes board-level metrics from the selected board, deleted count, and last activity timestamp.
- The component is self-contained and uses memoized derivations for summary metrics rather than depending on external state managers.

## Flow
1. `Sidebar` passes the active board and activity counters into `ProjectStatistics`.
2. The component derives counts, rates, and time-based summaries from the nested board model.
3. The view updates its relative-time label on a timer while the board remains selected.

## Integration
- Consumed by `src/components/layout/Sidebar.tsx`.
- Reads the shared `Board` structure from `src/types/`.
