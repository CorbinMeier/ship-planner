import { useState } from 'react'
import { GearIcon } from './icons'
import { DEFAULT_GROUP_ID } from './constants'
import type { Group } from '../../types/editor'

interface GroupsPanelProps {
  groups: Group[]
  activeGroupId: string
  onSetActive: (id: string) => void
  onToggleVisible: (id: string) => void
  onRename: (id: string, name: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onMerge: (ids: string[]) => void
}

function GroupsPanel({
  groups,
  activeGroupId,
  onSetActive,
  onToggleVisible,
  onRename,
  onCreate,
  onDelete,
  onMerge,
}: GroupsPanelProps) {
  const [mergeSelection, setMergeSelection] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [settingsOpenId, setSettingsOpenId] = useState<string | null>(null)

  const toggleMergeSelection = (id: string) => {
    setMergeSelection((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex w-56 flex-col gap-2 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Groups
      </p>

      <div className="flex flex-col gap-1">
        {groups.map((group) => (
          <div key={group.id} className="relative flex items-center gap-1">
            <input
              type="checkbox"
              checked={mergeSelection.has(group.id)}
              onChange={() => toggleMergeSelection(group.id)}
              aria-label={`Select ${group.name} to merge`}
              title="Select for merge"
              className="h-3.5 w-3.5 shrink-0 cursor-pointer"
            />

            {editingId === group.id ? (
              <input
                autoFocus
                type="text"
                defaultValue={group.name}
                onBlur={(e) => {
                  onRename(group.id, e.target.value.trim() || group.name)
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
                onClick={() => onSetActive(group.id)}
                onDoubleClick={() => setEditingId(group.id)}
                title="Click to make active, double-click to rename"
                className={`flex-1 truncate rounded px-2 py-1 text-left text-sm ${
                  activeGroupId === group.id
                    ? 'bg-brand-accent text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {group.name}
              </button>
            )}

            <button
              type="button"
              onClick={() => setSettingsOpenId((current) => (current === group.id ? null : group.id))}
              aria-label={`${group.name} settings`}
              aria-expanded={settingsOpenId === group.id}
              className="rounded p-1 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
            >
              <GearIcon />
            </button>

            {settingsOpenId === group.id && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <label className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
                  <input
                    type="checkbox"
                    checked={group.visible}
                    onChange={() => onToggleVisible(group.id)}
                    className="h-3.5 w-3.5 accent-brand-accent"
                  />
                  Visible
                </label>
                {group.id !== DEFAULT_GROUP_ID && (
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(group.id)
                      setSettingsOpenId(null)
                    }}
                    className="mt-1 w-full rounded border-t border-slate-200 px-2 py-1 pt-1.5 text-left text-xs text-red-500 hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-1 flex gap-1 border-t border-slate-200 pt-2 dark:border-slate-800">
        <button
          type="button"
          onClick={onCreate}
          className="flex-1 rounded bg-brand-accent px-2 py-1 text-xs font-medium text-white"
        >
          New group
        </button>
        <button
          type="button"
          disabled={mergeSelection.size < 2}
          onClick={() => {
            onMerge(Array.from(mergeSelection))
            setMergeSelection(new Set())
          }}
          className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
        >
          Merge selected
        </button>
      </div>
    </div>
  )
}

export default GroupsPanel
