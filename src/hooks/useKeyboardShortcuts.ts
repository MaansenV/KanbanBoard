import { useEffect } from 'react'

type ShortcutMap = {
  onCommandPalette?: () => void
  onNewCard?: () => void
  onToggleTheme?: () => void
  onEscape?: () => void
}

export const useKeyboardShortcuts = (shortcuts: ShortcutMap) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        shortcuts.onCommandPalette?.()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        shortcuts.onNewCard?.()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        shortcuts.onToggleTheme?.()
        return
      }
      if (e.key === 'Escape') {
        shortcuts.onEscape?.()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcuts])
}
