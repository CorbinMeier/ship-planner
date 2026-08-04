import { MAX_SCALE, MIN_SCALE } from './constants'
import type { ElementKind, ToolMode, ViewTransform } from '../../types/editor'

interface ToolbarProps {
  tool: ToolMode
  onToolChange: (tool: ToolMode) => void
  elementKind: ElementKind
  onElementKindChange: (kind: ElementKind) => void
  viewTransform: ViewTransform
  onViewTransformChange: (viewTransform: ViewTransform) => void
  selectedId: string | null
  onDeleteSelected: () => void
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
        active
          ? 'bg-brand-accent text-white'
          : 'bg-white text-brand-secondary hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

function Toolbar({
  tool,
  onToolChange,
  elementKind,
  onElementKindChange,
  viewTransform,
  onViewTransformChange,
  selectedId,
  onDeleteSelected,
}: ToolbarProps) {
  const zoom = (factor: number) => {
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, viewTransform.scale * factor),
    )
    onViewTransformChange({ ...viewTransform, scale: newScale })
  }

  return (
    <div className="absolute left-4 top-4 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-md">
      <div className="flex gap-1">
        <ToggleButton active={tool === 'select'} onClick={() => onToolChange('select')}>
          Select
        </ToggleButton>
        <ToggleButton active={tool === 'draw'} onClick={() => onToolChange('draw')}>
          Draw
        </ToggleButton>
      </div>

      {tool === 'draw' && (
        <div className="flex gap-1">
          <ToggleButton
            active={elementKind === 'wall'}
            onClick={() => onElementKindChange('wall')}
          >
            Wall
          </ToggleButton>
          <ToggleButton
            active={elementKind === 'room'}
            onClick={() => onElementKindChange('room')}
          >
            Room
          </ToggleButton>
        </div>
      )}

      <div className="flex gap-1">
        <ToggleButton active={false} onClick={() => zoom(1.25)}>
          +
        </ToggleButton>
        <ToggleButton active={false} onClick={() => zoom(0.8)}>
          −
        </ToggleButton>
        <ToggleButton
          active={false}
          onClick={() => onViewTransformChange({ offsetX: 0, offsetY: 0, scale: 1 })}
        >
          Reset
        </ToggleButton>
      </div>

      <button
        type="button"
        disabled={!selectedId}
        onClick={onDeleteSelected}
        className="rounded px-3 py-1 text-sm font-medium text-brand-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        Delete selected
      </button>
    </div>
  )
}

export default Toolbar
