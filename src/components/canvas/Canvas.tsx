import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import Grid from './Grid'
import CellRenderer from './CellRenderer'
import { CELL_SIZE, MAX_SCALE, MIN_SCALE } from './constants'
import { cellKey, cellsAlongLine, screenToCell, screenToLocal } from './geometry'
import type { EditorState, LegendEntry, ToolMode, ViewTransform } from '../../types/editor'

interface CanvasProps {
  state: EditorState
  onChange: (state: EditorState) => void
  tool: ToolMode
  activeLegendId: string | null
  viewTransform: ViewTransform
  onViewTransformChange: (viewTransform: ViewTransform) => void
}

type DragMode = 'none' | 'painting' | 'wall-drawing' | 'panning'

const FALLBACK_COLOR = '#94a3b8'
const MIDDLE_BUTTON = 1

function resolveColor(value: string, legend: LegendEntry[]): string {
  return legend.find((entry) => entry.id === value)?.color ?? FALLBACK_COLOR
}

function Canvas({
  state,
  onChange,
  tool,
  activeLegendId,
  viewTransform,
  onViewTransformChange,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  const dragModeRef = useRef<DragMode>('none')
  const lastPaintedRef = useRef<string | null>(null)
  const panLastRef = useRef({ x: 0, y: 0 })
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null)
  const [wallCurrent, setWallCurrent] = useState<{ x: number; y: number } | null>(null)

  // Kept current via effect so the imperative wheel listener (added once,
  // see below) always reads fresh values without needing to be re-attached.
  const viewTransformRef = useRef(viewTransform)
  useEffect(() => {
    viewTransformRef.current = viewTransform
  }, [viewTransform])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // React attaches onWheel as a passive listener, so calling
  // preventDefault() from a synthetic handler can't actually stop the
  // browser's own ctrl/cmd+scroll page zoom — the page zoom fired *and*
  // our own zoom fired, which is what desynced the grid before. A real
  // {passive:false} listener is required to suppress the native zoom.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const handleNativeWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault()
      const current = viewTransformRef.current
      if (e.ctrlKey || e.metaKey) {
        const rect = svg.getBoundingClientRect()
        const cursorX = e.clientX - rect.left
        const cursorY = e.clientY - rect.top
        const factor = Math.exp(-e.deltaY * 0.002)
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor))
        const ratio = newScale / current.scale
        onViewTransformChange({
          scale: newScale,
          offsetX: cursorX - (cursorX - current.offsetX) * ratio,
          offsetY: cursorY - (cursorY - current.offsetY) * ratio,
        })
      } else {
        onViewTransformChange({
          ...current,
          offsetX: current.offsetX - e.deltaX,
          offsetY: current.offsetY - e.deltaY,
        })
      }
    }

    svg.addEventListener('wheel', handleNativeWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleNativeWheel)
  }, [onViewTransformChange])

  const paintCell = useCallback(
    (x: number, y: number) => {
      const key = cellKey(x, y)
      const nextValue = activeLegendId ?? undefined
      if (state.cells[key] === nextValue) return
      const cells = { ...state.cells }
      if (nextValue === undefined) {
        delete cells[key]
      } else {
        cells[key] = nextValue
      }
      onChange({ ...state, cells })
    },
    [state, onChange, activeLegendId],
  )

  const cancelWallDraw = useCallback(() => {
    dragModeRef.current = 'none'
    setWallStart(null)
    setWallCurrent(null)
  }, [])

  const handlePointerDown = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      ;(e.target as Element).setPointerCapture?.(e.pointerId)

      if (e.button === MIDDLE_BUTTON) {
        e.preventDefault()
        dragModeRef.current = 'panning'
        panLastRef.current = { x: e.clientX, y: e.clientY }
        return
      }

      if (tool === 'paint') {
        const cell = screenToCell(e.clientX, e.clientY, rect, viewTransform)
        dragModeRef.current = 'painting'
        lastPaintedRef.current = cellKey(cell.x, cell.y)
        paintCell(cell.x, cell.y)
      } else {
        const local = screenToLocal(e.clientX, e.clientY, rect, viewTransform)
        dragModeRef.current = 'wall-drawing'
        setWallStart(local)
        setWallCurrent(local)
      }
    },
    [tool, viewTransform, paintCell],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (dragModeRef.current === 'panning') {
        const dx = e.clientX - panLastRef.current.x
        const dy = e.clientY - panLastRef.current.y
        panLastRef.current = { x: e.clientX, y: e.clientY }
        onViewTransformChange({
          ...viewTransform,
          offsetX: viewTransform.offsetX + dx,
          offsetY: viewTransform.offsetY + dy,
        })
        return
      }

      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return

      if (dragModeRef.current === 'painting') {
        const cell = screenToCell(e.clientX, e.clientY, rect, viewTransform)
        const key = cellKey(cell.x, cell.y)
        if (key !== lastPaintedRef.current) {
          lastPaintedRef.current = key
          paintCell(cell.x, cell.y)
        }
      } else if (dragModeRef.current === 'wall-drawing') {
        setWallCurrent(screenToLocal(e.clientX, e.clientY, rect, viewTransform))
      }
    },
    [viewTransform, onViewTransformChange, paintCell],
  )

  const handlePointerUp = useCallback(() => {
    if (dragModeRef.current === 'panning') {
      dragModeRef.current = 'none'
      return
    }
    if (dragModeRef.current === 'wall-drawing' && wallStart && wallCurrent) {
      const keys = cellsAlongLine(wallStart.x, wallStart.y, wallCurrent.x, wallCurrent.y)
      const nextValue = activeLegendId ?? undefined
      const cells = { ...state.cells }
      for (const key of keys) {
        if (nextValue === undefined) {
          delete cells[key]
        } else {
          cells[key] = nextValue
        }
      }
      onChange({ ...state, cells })
    }
    dragModeRef.current = 'none'
    lastPaintedRef.current = null
    setWallStart(null)
    setWallCurrent(null)
  }, [wallStart, wallCurrent, state, onChange, activeLegendId])

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()
      if (dragModeRef.current === 'wall-drawing') cancelWallDraw()
    },
    [cancelWallDraw],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragModeRef.current === 'wall-drawing') {
        cancelWallDraw()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cancelWallDraw])

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        className={`h-full w-full bg-slate-50 touch-none ${
          tool === 'wall' ? 'cursor-crosshair' : 'cursor-cell'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
      >
        <g
          transform={`translate(${viewTransform.offsetX}, ${viewTransform.offsetY}) scale(${viewTransform.scale})`}
        >
          <Grid
            viewTransform={viewTransform}
            viewportWidth={size.width}
            viewportHeight={size.height}
          />
          {Object.entries(state.cells).map(([key, value]) => {
            const [x, y] = key.split(',').map(Number)
            return <CellRenderer key={key} x={x} y={y} color={resolveColor(value, state.legend)} />
          })}
          {wallStart &&
            wallCurrent &&
            cellsAlongLine(wallStart.x, wallStart.y, wallCurrent.x, wallCurrent.y).map((key) => {
              const [x, y] = key.split(',').map(Number)
              return (
                <rect
                  key={key}
                  x={x * CELL_SIZE}
                  y={y * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill="none"
                  stroke="black"
                  strokeWidth={2}
                />
              )
            })}
          {wallStart && wallCurrent && (
            <line
              x1={wallStart.x * CELL_SIZE}
              y1={wallStart.y * CELL_SIZE}
              x2={wallCurrent.x * CELL_SIZE}
              y2={wallCurrent.y * CELL_SIZE}
              className="stroke-brand-accent"
              strokeWidth={3}
              strokeDasharray="6 4"
            />
          )}
        </g>
      </svg>
    </div>
  )
}

export default Canvas
