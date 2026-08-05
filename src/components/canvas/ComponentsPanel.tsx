import { useState } from 'react'
import { GearIcon } from './icons'
import type { Stamp } from '../../types/editor'

interface ComponentsPanelProps {
  stamps: Stamp[]
  activeStampId: string | null
  onSelect: (id: string | null) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

function ComponentsPanel({ stamps, activeStampId, onSelect, onRename, onDelete }: ComponentsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [settingsOpenId, setSettingsOpenId] = useState<string | null>(null)

  return (
    <div className="flex w-56 flex-col gap-2 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Components
      </p>

      {stamps.length === 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Select cells with the select tool, right-click, and choose "Save as component" to build your library.
        </p>
      )}

      <div className="flex flex-col gap-1">
        {stamps.map((stamp) => (
          <div key={stamp.id} className="relative flex items-center gap-1">
            {editingId === stamp.id ? (
              <input
                autoFocus
                type="text"
                defaultValue={stamp.name}
                onBlur={(e) => {
                  onRename(stamp.id, e.target.value.trim() || stamp.name)
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
                onClick={() => onSelect(activeStampId === stamp.id ? null : stamp.id)}
                onDoubleClick={() => setEditingId(stamp.id)}
                title="Click to arm the stamp tool, double-click to rename"
                className={`flex-1 truncate rounded px-2 py-1 text-left text-sm ${
                  activeStampId === stamp.id
                    ? 'bg-brand-accent text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {stamp.name}
              </button>
            )}

            <button
              type="button"
              onClick={() => setSettingsOpenId((current) => (current === stamp.id ? null : stamp.id))}
              aria-label={`${stamp.name} settings`}
              aria-expanded={settingsOpenId === stamp.id}
              className="rounded p-1 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
            >
              <GearIcon />
            </button>

            {settingsOpenId === stamp.id && (
              <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(stamp.id)
                    setSettingsOpenId(null)
                  }}
                  className="w-full rounded px-2 py-1 text-left text-xs text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ComponentsPanel
