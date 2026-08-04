import { useState } from 'react'
import type { LegendEntry } from '../../types/editor'

interface LegendProps {
  legend: LegendEntry[]
  activeLegendId: string | null
  onSelect: (id: string | null) => void
  onAdd: (label: string, color: string) => void
  onRemove: (id: string) => void
}

function Legend({ legend, activeLegendId, onSelect, onAdd, onRemove }: LegendProps) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('#22c55e')

  const handleAdd = () => {
    const trimmed = label.trim()
    if (!trimmed) return
    onAdd(trimmed, color)
    setLabel('')
  }

  return (
    <div className="absolute right-4 top-4 flex w-56 flex-col gap-2 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Key</p>

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`flex items-center gap-2 rounded px-2 py-1 text-left text-sm ${
          activeLegendId === null ? 'bg-brand-accent text-white' : 'hover:bg-slate-100'
        }`}
      >
        <span className="h-4 w-4 rounded border border-slate-300 bg-[repeating-linear-gradient(45deg,#e2e8f0_0,#e2e8f0_2px,transparent_2px,transparent_4px)]" />
        Eraser
      </button>

      <div className="flex flex-col gap-1">
        {legend.map((entry) => (
          <div key={entry.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(entry.id)}
              className={`flex flex-1 items-center gap-2 rounded px-2 py-1 text-left text-sm ${
                activeLegendId === entry.id ? 'bg-brand-accent text-white' : 'hover:bg-slate-100'
              }`}
            >
              <span
                className="h-4 w-4 rounded border border-slate-300"
                style={{ backgroundColor: entry.color }}
              />
              {entry.label}
            </button>
            <button
              type="button"
              onClick={() => onRemove(entry.id)}
              aria-label={`Remove ${entry.label}`}
              className="rounded px-1 text-xs text-slate-400 hover:text-red-500"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="mt-1 flex items-center gap-1 border-t border-slate-200 pt-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-7 w-7 shrink-0 cursor-pointer rounded border border-slate-300"
        />
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="New room type"
          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded bg-brand-accent px-2 py-1 text-sm text-white"
        >
          Add
        </button>
      </div>
    </div>
  )
}

export default Legend
