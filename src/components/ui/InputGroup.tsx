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
    <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-muted-foreground">
      {label}
      {children}
    </label>
    {type === 'textarea' ? (
      <textarea
        className="w-full rounded-lg border border-input bg-background/50 p-3 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <input
        type="text"
        className="w-full rounded-lg border border-input bg-background/50 p-3 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )}
  </div>
)
