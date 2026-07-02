import type { ReactNode } from 'react'

type BadgeProps = {
  children: ReactNode
  variant?: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline'
  className?: string
}

export const Badge = ({ children, variant = 'default', className = '' }: BadgeProps) => {
  const baseStyle =
    'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border transition-colors duration-200'

  const variants: Record<string, string> = {
    default: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-secondary text-secondary-foreground border-border',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    outline: 'bg-transparent text-muted-foreground border-muted-foreground/30',
  }

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
