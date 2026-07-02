import type { ReactNode } from 'react'

type InputGroupProps = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'textarea'
  placeholder?: string
  children?: ReactNode
}

export const InputGroup = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  children,
}: InputGroupProps) => (
  <div className="mb-4">
    <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-foreground">
      {label}
      {children}
    </label>
    {type === 'textarea' ? (
      <textarea
        className="form-input resize-none"
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <input
        type="text"
        className="form-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )}
  </div>
)
