import type { ReactNode } from 'react'
import { MAX_SCALE, MIN_SCALE } from './constants'
import { CircleIcon, FillIcon, PaintIcon, RectangleIcon, WallIcon } from './icons'
import type { ToolMode, ViewTransform } from '../../types/editor'

interface ToolbarProps {
  tool: ToolMode
  onToolChange: (tool: ToolMode) => void
  viewTransform: ViewTransform
  onViewTransformChange: (viewTransform: ViewTransform) => void
}

const TOOLS: { mode: ToolMode; label: string; icon: ReactNode }[] = [
  { mode: 'paint', label: 'Paint', icon: <PaintIcon /> },
  { mode: 'wall', label: 'Wall', icon: <WallIcon /> },
  { mode: 'circle', label: 'Circle', icon: <CircleIcon /> },
  { mode: 'rectangle', label: 'Rectangle', icon: <RectangleIcon /> },
  { mode: 'fill', label: 'Fill', icon: <FillIcon /> },
]

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {children}
    </p>
  )
}

function ToolButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-brand-accent text-white'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function Toolbar({ tool, onToolChange, viewTransform, onViewTransformChange }: ToolbarProps) {
  const setScale = (scale: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
    onViewTransformChange({ ...viewTransform, scale: clamped })
  }

  return (
    <div className="absolute left-4 top-4 flex w-64 flex-col gap-3 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex flex-col gap-1.5">
        <SectionLabel>Tools</SectionLabel>
        <div className="flex flex-wrap gap-1">
          {TOOLS.map(({ mode, label, icon }) => (
            <ToolButton
              key={mode}
              active={tool === mode}
              onClick={() => onToolChange(mode)}
              icon={icon}
              label={label}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-slate-200 pt-3 dark:border-slate-800">
        <SectionLabel>View</SectionLabel>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale(viewTransform.scale - 0.25)}
            className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            −
          </button>
          <input
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={0.05}
            value={viewTransform.scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="w-full accent-brand-accent"
          />
          <button
            type="button"
            onClick={() => setScale(viewTransform.scale + 0.25)}
            className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            +
          </button>
          <span className="w-10 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {Math.round(viewTransform.scale * 100)}%
          </span>
        </div>
        <button
          type="button"
          onClick={() => onViewTransformChange({ offsetX: 0, offsetY: 0, scale: 1 })}
          className="rounded px-2 py-1 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Reset view
        </button>
      </div>
    </div>
  )
}

export default Toolbar
