# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page Kanban Board application built with React, TypeScript, Vite, and Tailwind CSS. The entire application is contained in a single component (`src/App.tsx`) for simplicity. Features include drag-and-drop task management, multiple boards, priority levels, dark mode, and animated ASCII background.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (port 5173 by default)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

## Architecture & Key Concepts

### Single Component Architecture
- **Everything is in `src/App.tsx`**: All components (Modal, Button, InputGroup, Forms), state management, and logic are contained in a single 1000+ line file
- **No routing**: Board switching handled via state
- **Local storage persistence**: Boards auto-save to localStorage on every change

### Core Data Types (lines 46-78 in App.tsx)
- `Card`: Individual task with title, description, and priority
- `Column`: Container for cards with color coding
- `Board`: Container for columns
- `ModalState` & `DragState`: UI state management

### State Management Approach
- Uses React hooks (useState, useEffect, useMemo)
- Deep cloning for immutable updates via `deepClone` utility
- Drag-and-drop state tracked separately from data state

### Styling System
- Tailwind CSS with dark mode support (`dark:` prefixes)
- ASCII art background rendered on canvas (lines 95-201)
- Color scheme transitions smoothly between light/dark modes
- Priority levels have predefined color schemes (PRIORITIES constant)

## Testing Approach

No formal testing framework is configured. Manual testing through:
1. Run `npm run dev` and test in browser
2. Verify drag-and-drop between columns
3. Check localStorage persistence (refresh page)
4. Test dark/light mode toggle
5. Test import/export JSON functionality

## Deployment

Configured for GitHub Pages deployment:
- Base path set to `/KanbanBoard/` in vite.config.ts
- Deploy command builds and publishes to gh-pages branch

## Current Enhancement Focus

Based on `.cursor/plans/smooth-e73d41d4.plan.md`, the project is undergoing UI polish:
- Improving Light Mode visibility and contrast
- Sharpening Dark Mode appearance
- Fixing button and header element visibility
- Enhancing column and card contrast

## Important Notes

- **No component splitting**: Intentionally kept as single file for simplicity
- **No external state management**: No Redux, Zustand, etc.
- **Browser-only features**: Uses localStorage, drag-and-drop API
- **TypeScript strict mode**: Enabled with strict linting rules