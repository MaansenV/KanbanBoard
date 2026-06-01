# src/components/modals/

## Responsibility
Dialog workflows for creating/editing boards, columns, and cards, plus destructive-action confirmation and the command palette.

## Design
- Modal forms are controlled components: they accept `isOpen`, `initialData`, and submit/close callbacks from `App.tsx`.
- `BoardForm`, `ColumnForm`, and `CardForm` collect structured payloads and let the parent perform the actual mutation.
- `DeleteConfirm` is a narrow confirmation dialog used to gate irreversible actions.
- `CommandPalette` implements local search, keyboard navigation, and command execution with its own ephemeral UI state.

## Flow
1. `App.tsx` opens the relevant modal by setting `ModalState`.
2. Form components hydrate local fields from `initialData` when opened.
3. On submit, the modal emits normalized data back to `App.tsx`, which mutates board state and closes the dialog.
4. `CommandPalette` filters `CommandPaletteAction[]` and invokes the selected action directly.

## Integration
- Depends on `src/components/ui/` primitives and the shared types in `src/types/`.
- Drives `useBoards` mutations indirectly through `App.tsx` callbacks.
