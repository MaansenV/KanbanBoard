import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/KanbanBoard/' : '/',
  server: {
    host: '127.0.0.1',
    port: 4173,
  },
}))

