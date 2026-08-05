import { useState } from 'react'
import { GearIcon } from './icons'
import type { LegendEntry } from '../../types/editor'

const DEFAULT_COLOR = '#64748b' // cold steel

interface LegendProps {
  legend: LegendEntry[]
  // Local override per legend id; undefined means "follow the global default".
  localHidden: Record<string, boolean>
  activeLegendId: string | null
  onSelect: (id: string | null) => void
  onAdd: (label: string, color: string) => void
  onRemove: (id: string) => void
  onToggleLocalVisible: (id: string) => void
  onToggleGlobalVisible: (id: string) => void
  onRename: (id: string, label: string) => void
}

function Legend({
  legend,
  localHidden,
  activeLegendId,
  onSelect,
  onAdd,
  onRemove,
  onToggleLocalVisible,
  onToggleGlobalVisible,
  onRename,
}: LegendProps) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [settingsOpenId, setSettingsOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleAdd = () => {
    const trimmed = label.trim()
    if (!trimmed) return
    onAdd(trimmed, color)
    setLabel('')
  }

  return (
    <div className="absolute right-4 top-4 flex w-56 flex-col gap-2 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Legend
      </p>

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`flex items-center gap-2 rounded px-2 py-1 text-left text-sm ${
          activeLegendId === null
            ? 'bg-brand-accent text-white'
            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
        }`}
      >
        <span className="h-4 w-4 rounded border border-slate-300 bg-[repeating-linear-gradient(45deg,#e2e8f0_0,#e2e8f0_2px,transparent_2px,transparent_4px)]" />
        Eraser
      </button>

      <div className="flex flex-col gap-1">
        {legend.map((entry) => {
          const locallyVisible = localHidden[entry.id] ?? entry.visible
          return (
          <div key={entry.id} className="relative flex items-center gap-1">
            <input
              type="checkbox"
              checked={locallyVisible}
              onChange={() => onToggleLocalVisible(entry.id)}
              aria-label={locallyVisible ? `Hide ${entry.label} (this device)` : `Show ${entry.label} (this device)`}
              title={locallyVisible ? 'Visible on this device' : 'Hidden on this device'}
              className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-brand-accent"
            />
            {editingId === entry.id ? (
              <input
                autoFocus
                type="text"
                defaultValue={entry.label}
                onBlur={(e) => {
                  onRename(entry.id, e.target.value.trim() || entry.label)
                  setEditingId(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-1.5 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            ) : (
              <button
                type="button"
                onClick={() => onSelect(entry.id)}
                onDoubleClick={() => setEditingId(entry.id)}
                title="Click to select, double-click to rename"
                className={`flex flex-1 items-center gap-2 truncate rounded px-2 py-1 text-left text-sm ${
                  activeLegendId === entry.id
                    ? 'bg-brand-accent text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded border border-slate-300"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="truncate">{entry.label}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpenId((current) => (current === entry.id ? null : entry.id))}
              aria-label={`${entry.label} settings`}
              aria-expanded={settingsOpenId === entry.id}
              className="rounded p-1 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
            >
              <GearIcon />
            </button>

            {settingsOpenId === entry.id && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <label className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
                  <input
                    type="checkbox"
                    checked={locallyVisible}
                    onChange={() => onToggleLocalVisible(entry.id)}
                    className="h-3.5 w-3.5 accent-brand-accent"
                  />
                  Visible (this device)
                </label>
                <label className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
                  <input
                    type="checkbox"
                    checked={entry.visible}
                    onChange={() => onToggleGlobalVisible(entry.id)}
                    className="h-3.5 w-3.5 accent-brand-accent"
                  />
                  Visible by default (global)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onRemove(entry.id)
                    setSettingsOpenId(null)
                  }}
                  className="mt-1 w-full rounded border-t border-slate-200 px-2 py-1 pt-1.5 text-left text-xs text-red-500 hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          )
        })}
      </div>

      <div className="mt-1 flex items-center gap-1 border-t border-slate-200 pt-2 dark:border-slate-800">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-7 w-7 shrink-0 cursor-pointer rounded border border-slate-300 dark:border-slate-700"
        />
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="New room type"
          className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
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
