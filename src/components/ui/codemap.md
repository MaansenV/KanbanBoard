# src/components/ui/

## Responsibility
Low-level reusable UI primitives and micro-interactions used across the app.

## Design
- Presentational wrappers (`Button`, `Input`, `Badge`, `Modal`, `Tooltip`, `Toast`, `InputGroup`, `CustomDropdown`) encapsulate Tailwind styling and interaction details.
- Components are intentionally small and mostly stateless; behavior is delegated to props and local browser events.
- `CustomDropdown` and `Tooltip` implement their own open/close state and keyboard or hover affordances.

## Flow
1. Feature components compose these primitives instead of duplicating styling or accessibility behavior.
2. User actions on these primitives propagate up through callbacks to feature components and `App.tsx`.

## Integration
- Shared by layout, modal, board, and stats components.
- Acts as the app's informal design system.
