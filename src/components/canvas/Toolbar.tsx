import type { ReactNode } from 'react'
import { MAX_SCALE, MIN_SCALE } from './constants'
import { CircleIcon, FillIcon, PaintIcon, RectangleIcon, SelectIcon, StampIcon, WallIcon } from './icons'
import type { LayerScope, ToolMode, ViewTransform } from '../../types/editor'

interface ToolbarProps {
  tool: ToolMode
  onToolChange: (tool: ToolMode) => void
  viewTransform: ViewTransform
  onViewTransformChange: (viewTransform: ViewTransform) => void
  layerScope: LayerScope
  onLayerScopeChange: (scope: LayerScope) => void
}

const TOOLS: { mode: ToolMode; label: string; icon: ReactNode }[] = [
  { mode: 'paint', label: 'Paint', icon: <PaintIcon /> },
  { mode: 'wall', label: 'Wall', icon: <WallIcon /> },
  { mode: 'circle', label: 'Circle', icon: <CircleIcon /> },
  { mode: 'rectangle', label: 'Rectangle', icon: <RectangleIcon /> },
  { mode: 'fill', label: 'Fill', icon: <FillIcon /> },
  { mode: 'select', label: 'Select & Move', icon: <SelectIcon /> },
  { mode: 'stamp', label: 'Stamp component', icon: <StampIcon /> },
]

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
      aria-label={label}
      aria-pressed={active}
      className={`rounded p-1.5 transition-colors ${
        active
          ? 'bg-brand-accent text-white'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
    </button>
  )
}

// Rendered inline inside EditorHeader as a single linear bar — no card
// chrome of its own (border/shadow/background come from the header).
function Toolbar({
  tool,
  onToolChange,
  viewTransform,
  onViewTransformChange,
  layerScope,
  onLayerScopeChange,
}: ToolbarProps) {
  const setScale = (scale: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
    onViewTransformChange({ ...viewTransform, scale: clamped })
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-0.5">
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

      <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setScale(viewTransform.scale - 0.25)}
          className="rounded px-1.5 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
          className="w-24 accent-brand-accent"
        />
        <button
          type="button"
          onClick={() => setScale(viewTransform.scale + 0.25)}
          className="rounded px-1.5 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          +
        </button>
        <span className="w-9 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {Math.round(viewTransform.scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => onViewTransformChange({ offsetX: 0, offsetY: 0, scale: 1 })}
          className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Reset
        </button>
      </div>

      {tool === 'select' && (
        <select
          value={layerScope}
          onChange={(e) => onLayerScopeChange(e.target.value as LayerScope)}
          title="Which layers moving/selecting affects"
          className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="all">All layers</option>
          <option value="active">This layer</option>
        </select>
      )}
    </div>
  )
}

export default Toolbar
