import type { ReactNode } from 'react'

type ButtonProps = {
  children: ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
  title?: string
}

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled,
  type = 'button',
  title,
}: ButtonProps) => {
  const baseStyle =
    'px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 select-none disabled:opacity-50 disabled:cursor-not-allowed rounded-lg active:scale-95'
  const variants: Record<string, string> = {
    primary:
      'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25',
    secondary:
      'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border shadow-sm',
    danger:
      'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20',
    ghost:
      'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
    icon: 'p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
