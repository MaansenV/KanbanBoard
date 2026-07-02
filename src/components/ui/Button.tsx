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
  const variantClass: Record<string, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
    icon: 'btn-icon',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${variantClass[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
