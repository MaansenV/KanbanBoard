# src/utils/

## Responsibility
Shared utility layer for identifiers, cloning, API constants, demo data, and three-way merge logic.

## Design
- `helpers.ts` provides client-safe primitives such as `generateId`, `deepClone`, `fetchWithTimeout`, and `createDemoBoard`.
- `merge.ts` implements conflict resolution helpers for board, column, card, and subtask entities.
- Utility functions are intentionally stateless and side-effect free except where they touch browser APIs or constant initialization.

## Flow
1. Hooks import the helper utilities for API access, demo state creation, and local persistence support.
2. `useOfflineSync` uses `mergeBoards` to reconcile local edits with stale remote state.
3. Board creation and form flows use `generateId` for nested entities.

## Integration
- Consumed by `src/hooks/useOfflineSync.ts`, `src/hooks/useBoards.ts`, and modal forms.
- Mirrors the board structure defined in `src/types/index.ts`.
