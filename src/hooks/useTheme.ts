import { useEffect, useState } from 'react'

export const useTheme = () => {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true
    // Check localStorage first, then OS preference, default to true (dark)
    const saved = window.localStorage.getItem('kanban-theme')
    if (saved) return saved === 'dark'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', darkMode)
    window.localStorage.setItem('kanban-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const toggleTheme = () => setDarkMode(prev => !prev)

  return { darkMode, setDarkMode, toggleTheme }
}
