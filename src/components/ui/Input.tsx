import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        className={`w-full rounded-lg border bg-background/50 p-3 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 ${
          error
            ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
            : 'border-input focus:border-primary focus:ring-primary/20'
        } ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
