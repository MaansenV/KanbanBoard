# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page Kanban Board application built with React, TypeScript, Vite, and Tailwind CSS. The application is modularly structured with components and custom hooks for cleaner state management. Features include drag-and-drop task management, multiple boards, priority levels, dark mode, and animated ASCII background.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (port 4173)
npm run dev

# Run local offline mode with live JSON storage and the HTTP MCP server
npm run dev:offline

# Run the Kanban MCP server over stdio
npm run mcp

# Run the Kanban MCP server over HTTP for Codex
npm run mcp:http

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

## Architecture & Key Concepts

### Modular Architecture
- **App entrypoint in `src/App.tsx`**: Renders the core layout, stats, activity log, and initializes the board hooks and modals.
- **Component Splitting**: Sub-components are stored in `src/components/`, e.g., the board logic (`Card.tsx`, `Column.tsx`, `BoardTabs.tsx`, `SubtaskList.tsx`), layouts, stats, and modals.
- **State Hook**: Board state and CRUD operations are managed in `src/hooks/useBoards.ts`.
- **No routing**: Board switching handled via React state.
- **Local storage persistence**: Boards auto-save to localStorage on every change.
- **Offline API persistence**: In `npm run dev:offline`, the app syncs to `data/kanban.json` through `server/offline-server.mjs`.
- **MCP access**: `server/mcp-http-server.mjs` exposes read/write tools for Codex over HTTP at `http://127.0.0.1:4175/mcp`; `server/mcp-server.mjs` keeps the stdio transport for clients that launch commands.

### Core Data Types (defined in `src/types/index.ts`)
- `Card`: Individual task with title, description, priority, subtasks list, etc.
- `Column`: Container for cards with color coding.
- `Board`: Container for columns.
- `ModalState` & `DragState`: UI state management.

### Styling System
- Tailwind CSS with dark mode support (`dark:` prefixes)
- ASCII art background rendered on canvas
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

- **Modular component structure**: Clean separation of hooks, types, and UI components.
- **No external state management**: No Redux, Zustand, etc.
- **Browser-only features**: Uses localStorage, drag-and-drop API
- **TypeScript strict mode**: Enabled with strict linting rules
