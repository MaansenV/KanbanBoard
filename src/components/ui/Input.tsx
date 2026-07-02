import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        className={`form-input ${error ? 'form-input-error' : ''} ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
