import type { ReactNode } from 'react'
import { useState } from 'react'

type TooltipProps = {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export const Tooltip = ({ content, children, position = 'top', className = '' }: TooltipProps) => {
  const [visible, setVisible] = useState(false)

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 pointer-events-none whitespace-nowrap rounded-lg border border-border/70 bg-card px-2.5 py-1 text-[11px] font-medium text-card-foreground shadow-float animate-fade-in ${positionClasses[position]}`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  )
}
