import React from 'react'

export type WindowOption = '24h' | '3d' | '7d' | '30d'

interface WindowPickerProps {
  selected: WindowOption
  onChange: (val: WindowOption) => void
  disabled?: boolean
}

export const WindowPicker: React.FC<WindowPickerProps> = ({
  selected,
  onChange,
  disabled = false,
}) => {
  const options: { id: WindowOption; label: string }[] = [
    { id: '24h', label: '24h' },
    { id: '3d', label: '3d' },
    { id: '7d', label: '7d' },
    { id: '30d', label: '30d' },
  ]

  return (
    <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
      {options.map((opt) => {
        const isActive = selected === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              isActive
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
