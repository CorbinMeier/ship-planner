import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import Grid from './Grid'
import CellRenderer from './CellRenderer'
import PreviewCells from './PreviewCells'
import { CELL_SIZE, MAX_SCALE, MIN_SCALE, PREVIEW_CLASS, PREVIEW_STROKE } from './constants'
import { applyCellValue, floodFillCells } from './cellOps'
import {
  cellKey,
  cellsAlongLine,
  cellsInCircle,
  cellsInPolygon,
  orientedRectCorners,
  screenToCell,
  screenToLocal,
} from './geometry'
import type { Point } from './geometry'
import type { EditorState, LegendEntry, ToolMode, ViewTransform } from '../../types/editor'

interface CanvasProps {
  state: EditorState
  onChange: (state: EditorState) => void
  tool: ToolMode
  activeLegendId: string | null
  viewTransform: ViewTransform
  onViewTransformChange: (viewTransform: ViewTransform) => void
}

type DragMode = 'none' | 'painting' | 'wall-drawing' | 'circle-drawing' | 'panning'

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

  const [wallStart, setWallStart] = useState<Point | null>(null)
  const [wallCurrent, setWallCurrent] = useState<Point | null>(null)
  const [circleCenter, setCircleCenter] = useState<Point | null>(null)
  const [circleCurrent, setCircleCurrent] = useState<Point | null>(null)
  // Rectangle is click-click-click, not a drag: 0, 1, or 2 committed points
  // plus the live cursor position driving the in-progress preview.
  const [rectPoints, setRectPoints] = useState<Point[]>([])
  const [rectCursor, setRectCursor] = useState<Point | null>(null)
  const [fillWarning, setFillWarning] = useState(false)

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
      onChange({ ...state, cells: applyCellValue(state.cells, [key], nextValue) })
    },
    [state, onChange, activeLegendId],
  )

  const cancelActiveDraw = useCallback(() => {
    dragModeRef.current = 'none'
    setWallStart(null)
    setWallCurrent(null)
    setCircleCenter(null)
    setCircleCurrent(null)
    setRectPoints([])
    setRectCursor(null)
  }, [])

  // Switching tools mid-gesture (e.g. clicking a toolbar button while a
  // rectangle is half-drawn) shouldn't leave a stuck preview behind.
  useEffect(() => {
    cancelActiveDraw()
  }, [tool, cancelActiveDraw])

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

      const local = screenToLocal(e.clientX, e.clientY, rect, viewTransform)

      if (tool === 'rectangle') {
        if (rectPoints.length < 2) {
          setRectPoints([...rectPoints, local])
        } else {
          const corners = orientedRectCorners(rectPoints[0], rectPoints[1], local)
          const keys = cellsInPolygon(corners)
          onChange({ ...state, cells: applyCellValue(state.cells, keys, activeLegendId ?? undefined) })
          setRectPoints([])
        }
        setRectCursor(local)
        return
      }

      if (tool === 'paint') {
        const cell = screenToCell(e.clientX, e.clientY, rect, viewTransform)
        dragModeRef.current = 'painting'
        lastPaintedRef.current = cellKey(cell.x, cell.y)
        paintCell(cell.x, cell.y)
      } else if (tool === 'wall') {
        dragModeRef.current = 'wall-drawing'
        setWallStart(local)
        setWallCurrent(local)
      } else if (tool === 'circle') {
        dragModeRef.current = 'circle-drawing'
        setCircleCenter(local)
        setCircleCurrent(local)
      } else if (tool === 'fill') {
        const cell = screenToCell(e.clientX, e.clientY, rect, viewTransform)
        const filled = floodFillCells(state.cells, cell.x, cell.y)
        if (filled === null) {
          setFillWarning(true)
          window.setTimeout(() => setFillWarning(false), 1500)
        } else {
          onChange({
            ...state,
            cells: applyCellValue(state.cells, filled, activeLegendId ?? undefined),
          })
        }
      }
    },
    [tool, viewTransform, paintCell, state, onChange, activeLegendId, rectPoints],
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

      if (tool === 'rectangle' && rectPoints.length > 0) {
        setRectCursor(screenToLocal(e.clientX, e.clientY, rect, viewTransform))
        return
      }

      if (dragModeRef.current === 'painting') {
        const cell = screenToCell(e.clientX, e.clientY, rect, viewTransform)
        const key = cellKey(cell.x, cell.y)
        if (key !== lastPaintedRef.current) {
          lastPaintedRef.current = key
          paintCell(cell.x, cell.y)
        }
      } else if (dragModeRef.current === 'wall-drawing') {
        setWallCurrent(screenToLocal(e.clientX, e.clientY, rect, viewTransform))
      } else if (dragModeRef.current === 'circle-drawing') {
        setCircleCurrent(screenToLocal(e.clientX, e.clientY, rect, viewTransform))
      }
    },
    [tool, rectPoints, viewTransform, onViewTransformChange, paintCell],
  )

  const handlePointerUp = useCallback(() => {
    if (dragModeRef.current === 'panning') {
      dragModeRef.current = 'none'
      return
    }
    if (dragModeRef.current === 'wall-drawing' && wallStart && wallCurrent) {
      const keys = cellsAlongLine(wallStart.x, wallStart.y, wallCurrent.x, wallCurrent.y)
      onChange({ ...state, cells: applyCellValue(state.cells, keys, activeLegendId ?? undefined) })
    } else if (dragModeRef.current === 'circle-drawing' && circleCenter && circleCurrent) {
      const radius = Math.hypot(circleCurrent.x - circleCenter.x, circleCurrent.y - circleCenter.y)
      const keys = cellsInCircle(circleCenter.x, circleCenter.y, radius)
      onChange({ ...state, cells: applyCellValue(state.cells, keys, activeLegendId ?? undefined) })
    }
    dragModeRef.current = 'none'
    lastPaintedRef.current = null
    setWallStart(null)
    setWallCurrent(null)
    setCircleCenter(null)
    setCircleCurrent(null)
  }, [wallStart, wallCurrent, circleCenter, circleCurrent, state, onChange, activeLegendId])

  const isDrawInProgress = useCallback(
    () => dragModeRef.current === 'wall-drawing' || dragModeRef.current === 'circle-drawing' || rectPoints.length > 0,
    [rectPoints],
  )

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()
      if (isDrawInProgress()) cancelActiveDraw()
    },
    [cancelActiveDraw, isDrawInProgress],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawInProgress()) {
        cancelActiveDraw()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cancelActiveDraw, isDrawInProgress])

  const circleRadius =
    circleCenter && circleCurrent
      ? Math.hypot(circleCurrent.x - circleCenter.x, circleCurrent.y - circleCenter.y)
      : 0

  const rectCorners =
    rectPoints.length === 2 && rectCursor
      ? orientedRectCorners(rectPoints[0], rectPoints[1], rectCursor)
      : null

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        className={`h-full w-full touch-none bg-slate-50 dark:bg-slate-900 ${
          tool === 'wall' || tool === 'circle' || tool === 'rectangle' ? 'cursor-crosshair' : 'cursor-cell'
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

          {wallStart && wallCurrent && (
            <>
              <PreviewCells keys={cellsAlongLine(wallStart.x, wallStart.y, wallCurrent.x, wallCurrent.y)} />
              <line
                x1={wallStart.x * CELL_SIZE}
                y1={wallStart.y * CELL_SIZE}
                x2={wallCurrent.x * CELL_SIZE}
                y2={wallCurrent.y * CELL_SIZE}
                stroke={PREVIEW_STROKE}
                strokeWidth={3}
                strokeDasharray="6 4"
                className={PREVIEW_CLASS}
              />
            </>
          )}

          {circleCenter && circleCurrent && (
            <>
              <PreviewCells keys={cellsInCircle(circleCenter.x, circleCenter.y, circleRadius)} />
              <circle
                cx={circleCenter.x * CELL_SIZE}
                cy={circleCenter.y * CELL_SIZE}
                r={circleRadius * CELL_SIZE}
                fill="none"
                stroke={PREVIEW_STROKE}
                strokeWidth={2}
                className={PREVIEW_CLASS}
              />
            </>
          )}

          {rectPoints.length === 1 && rectCursor && (
            <line
              x1={rectPoints[0].x * CELL_SIZE}
              y1={rectPoints[0].y * CELL_SIZE}
              x2={rectCursor.x * CELL_SIZE}
              y2={rectCursor.y * CELL_SIZE}
              stroke={PREVIEW_STROKE}
              strokeWidth={3}
              strokeDasharray="6 4"
              className={PREVIEW_CLASS}
            />
          )}

          {rectCorners && (
            <>
              <PreviewCells keys={cellsInPolygon(rectCorners)} />
              <polygon
                points={rectCorners.map((p) => `${p.x * CELL_SIZE},${p.y * CELL_SIZE}`).join(' ')}
                fill="none"
                stroke={PREVIEW_STROKE}
                strokeWidth={2}
                className={PREVIEW_CLASS}
              />
            </>
          )}
        </g>
      </svg>

      {fillWarning && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-red-600 px-3 py-1 text-sm text-white shadow">
          Can't fill an unbounded region
        </div>
      )}
    </div>
  )
}

export default Canvas
