import type { ReactNode } from 'react'
import { MAX_SCALE, MIN_SCALE } from './constants'
import type { ToolMode, ViewTransform } from '../../types/editor'

interface ToolbarProps {
  tool: ToolMode
  onToolChange: (tool: ToolMode) => void
  viewTransform: ViewTransform
  onViewTransformChange: (viewTransform: ViewTransform) => void
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
        active ? 'bg-brand-accent text-white' : 'bg-white text-brand-secondary hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

function Toolbar({ tool, onToolChange, viewTransform, onViewTransformChange }: ToolbarProps) {
  const setScale = (scale: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
    onViewTransformChange({ ...viewTransform, scale: clamped })
  }

  return (
    <div className="absolute left-4 top-4 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md">
      <div className="flex gap-1">
        <ToggleButton active={tool === 'paint'} onClick={() => onToolChange('paint')}>
          Paint
        </ToggleButton>
        <ToggleButton active={tool === 'wall'} onClick={() => onToolChange('wall')}>
          Wall
        </ToggleButton>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setScale(viewTransform.scale - 0.25)}
          className="rounded bg-white px-2 py-1 text-sm text-brand-secondary hover:bg-slate-100"
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
          className="w-28"
        />
        <button
          type="button"
          onClick={() => setScale(viewTransform.scale + 0.25)}
          className="rounded bg-white px-2 py-1 text-sm text-brand-secondary hover:bg-slate-100"
        >
          +
        </button>
        <span className="w-10 text-right text-xs text-slate-500">
          {Math.round(viewTransform.scale * 100)}%
        </span>
      </div>

      <button
        type="button"
        onClick={() => onViewTransformChange({ offsetX: 0, offsetY: 0, scale: 1 })}
        className="rounded px-3 py-1 text-left text-sm font-medium text-brand-secondary hover:bg-slate-100"
      >
        Reset view
      </button>
    </div>
  )
}

export default Toolbar
