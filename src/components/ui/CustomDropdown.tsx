import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export type DropdownOption = {
  value: string
  label: string
  icon?: React.ReactNode
  colorDot?: string // css background color class e.g. 'bg-red-500'
}

type CustomDropdownProps = {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  ariaLabel?: string
  className?: string
}

export const CustomDropdown = ({
  value,
  onChange,
  options,
  placeholder = 'Auswählen...',
  ariaLabel,
  className = '',
}: CustomDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset keyboard focus index when dropdown opens/closes
  useEffect(() => {
    if (isOpen) {
      const index = options.findIndex((opt) => opt.value === value)
      setFocusedIndex(index >= 0 ? index : 0)
    } else {
      setFocusedIndex(-1)
    }
  }, [isOpen, value, options])

  const handleToggle = () => setIsOpen((prev) => !prev)

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      return
    }

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev + 1) % options.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev - 1 + options.length) % options.length)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (focusedIndex >= 0 && focusedIndex < options.length) {
        handleSelect(options[focusedIndex].value)
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false)
    }
  }

  return (
    <div
      className={`relative inline-block text-left ${className}`}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 ${
          isOpen ? 'border-primary ring-2 ring-primary/20' : ''
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="text-muted-foreground shrink-0">{selectedOption.icon}</span>
          )}
          {selectedOption?.colorDot && (
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${selectedOption.colorDot}`} />
          )}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-muted-foreground shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Floating Options Menu */}
      {isOpen && (
        <ul
          className="absolute z-50 mt-1.5 max-h-60 w-full min-w-[200px] overflow-y-auto rounded-lg border border-border/80 bg-card/90 p-1 shadow-xl backdrop-blur-xl animate-fade-in custom-scrollbar focus:outline-none"
          role="listbox"
          aria-label={ariaLabel}
          style={{
            animation: 'scale-in 0.15s ease-out',
          }}
        >
          {options.map((opt, index) => {
            const isSelected = opt.value === value
            const isFocused = index === focusedIndex

            return (
              <li
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`relative flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-medium'
                    : isFocused
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                {opt.icon && (
                  <span className={`shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                    {opt.icon}
                  </span>
                )}
                {opt.colorDot && (
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${opt.colorDot}`} />
                )}
                <span className="truncate flex-1">{opt.label}</span>
                {isSelected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
