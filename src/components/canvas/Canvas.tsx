import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import Grid from './Grid'
import CellRenderer from './CellRenderer'
import PreviewCells from './PreviewCells'
import { CELL_SIZE, DEFAULT_GROUP_ID, MAX_SCALE, MIN_SCALE, PREVIEW_CLASS, PREVIEW_STROKE } from './constants'
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
import type {
  CellValue,
  EditorState,
  Group,
  GroupMembership,
  LayerScope,
  LayersState,
  LegendEntry,
  Stamp,
  ToolMode,
  ViewTransform,
} from '../../types/editor'

interface CanvasProps {
  state: EditorState
  onChange: (state: EditorState) => void
  tool: ToolMode
  activeLegendId: string | null
  viewTransform: ViewTransform
  onViewTransformChange: (viewTransform: ViewTransform) => void
  // Ghost layers: the deck immediately below/above, shown faded and
  // color-washed so the current layer's plan lines up with its neighbors
  // without being mistaken for editable content.
  belowCells?: Record<string, CellValue>
  aboveCells?: Record<string, CellValue>
  // Groups/select-and-move support. `layers`/`layer` give the select tool
  // visibility across the whole plan (not just the active layer's cells).
  layer: number
  layers: LayersState
  groups: Group[]
  groupMembership: GroupMembership
  activeGroupId: string
  layerScope: LayerScope
  onMoveSelection: (keys: string[], dx: number, dy: number) => void
  onCopySelection: (keys: string[]) => void
  onSeparateSelection: (keys: string[]) => void
  onSaveComponent: (keys: string[]) => void
  onPickColor: (legendId: string | null) => void
  // Active stamp for the 'stamp' tool; placing writes its cells at the
  // clicked origin into a brand-new group, like a mini import.
  stamp: Stamp | null
  onPlaceStamp: (stamp: Stamp, originX: number, originY: number) => void
}

type DragMode =
  | 'none'
  | 'painting'
  | 'wall-drawing'
  | 'circle-drawing'
  | 'panning'
  | 'marquee'
  | 'moving-selection'

const FALLBACK_COLOR = '#94a3b8'
const MIDDLE_BUTTON = 1
const GHOST_OPACITY = 0.3
const BELOW_TINT = 'rgba(59, 130, 246, 0.5)' // blue: layer below
const ABOVE_TINT = 'rgba(249, 115, 22, 0.5)' // amber: layer above
const EYEDROPPER_CURSOR =
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\'%3E%3Cpath d=\'m14.5 6.5 3 3M4 20l1-4 9-9 3 3-9 9-4 1Z\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'2\'/%3E%3Cpath d=\'m14.5 6.5 3 3M4 20l1-4 9-9 3 3-9 9-4 1Z\' fill=\'none\' stroke=\'%23000\' stroke-width=\'0.75\'/%3E%3C/svg%3E") 2 22, crosshair'

function resolveColor(value: string, legend: LegendEntry[]): string {
  return legend.find((entry) => entry.id === value)?.color ?? FALLBACK_COLOR
}

function isVisible(value: string, legend: LegendEntry[]): boolean {
  return legend.find((entry) => entry.id === value)?.visible ?? true
}

function shiftCoord(coord: string, dx: number, dy: number): string {
  const [x, y] = coord.split(',').map(Number)
  return `${x + dx},${y + dy}`
}

function Canvas({
  state,
  onChange,
  tool,
  activeLegendId,
  viewTransform,
  onViewTransformChange,
  belowCells,
  aboveCells,
  layer,
  layers,
  groups,
  groupMembership,
  activeGroupId,
  layerScope,
  onMoveSelection,
  onCopySelection,
  onSeparateSelection,
  onSaveComponent,
  onPickColor,
  stamp,
  onPlaceStamp,
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

  // Select & move tool. Selected keys are "layer:x,y" composite strings so a
  // single selection can span every layer when layerScope is "all".
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [marqueeStart, setMarqueeStart] = useState<Point | null>(null)
  const [marqueeCurrent, setMarqueeCurrent] = useState<Point | null>(null)
  const [moveOrigin, setMoveOrigin] = useState<Point | null>(null)
  const [moveDelta, setMoveDelta] = useState({ dx: 0, dy: 0 })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  // Left Ctrl acts as a color-picker/eyedropper while held, regardless of tool.
  const [ctrlActive, setCtrlActive] = useState(false)
  // Live readout of the key under the cursor while ctrlActive — updates on
  // every pointer move, not just on click.
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; label: string; color: string | null } | null>(
    null,
  )
  // Cell under the cursor while the stamp tool is armed, used to preview
  // where the stamp's cells will land before the click commits them.
  const [stampHoverCell, setStampHoverCell] = useState<Point | null>(null)
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') setCtrlActive(true)
    }
    const handleUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setCtrlActive(false)
        setHoverInfo(null)
      }
    }
    const handleBlur = () => {
      setCtrlActive(false)
      setHoverInfo(null)
    }
    window.addEventListener('keydown', handleDown)
    window.addEventListener('keyup', handleUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleDown)
      window.removeEventListener('keyup', handleUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

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

  // A cell is "disabled" — and therefore off-limits to the eraser, fill, and
  // select/move tools — if its legend key is hidden (locally or globally,
  // already merged into state.legend by the caller) or its group is hidden.
  const isCellActive = useCallback(
    (ln: number, coord: string, value: string) => {
      if (!isVisible(value, state.legend)) return false
      const groupId = groupMembership[`${ln}:${coord}`]
      if (groupId) {
        const group = groups.find((g) => g.id === groupId)
        if (group && !group.visible) return false
      }
      return true
    },
    [state.legend, groups, groupMembership],
  )

  // Erasing is further restricted to the active group: with a group
  // selected, cells belonging to a different group are off-limits so a
  // stray erase stroke can't reach into someone else's group.
  const isEraseAllowed = useCallback(
    (ln: number, coord: string, value: string) => {
      if (!isCellActive(ln, coord, value)) return false
      const groupId = groupMembership[`${ln}:${coord}`] ?? DEFAULT_GROUP_ID
      return groupId === activeGroupId
    },
    [isCellActive, groupMembership, activeGroupId],
  )

  const filterEraseKeys = useCallback(
    (keys: Iterable<string>) => {
      const arr = Array.from(keys)
      if (activeLegendId !== null) return arr
      return arr.filter((key) => {
        const current = state.cells[key]
        return current === undefined || isEraseAllowed(layer, key, current)
      })
    },
    [activeLegendId, state.cells, isEraseAllowed, layer],
  )

  const paintCell = useCallback(
    (x: number, y: number) => {
      const key = cellKey(x, y)
      const nextValue = activeLegendId ?? undefined
      const current = state.cells[key]
      if (current === nextValue) return
      if (nextValue === undefined && current !== undefined && !isEraseAllowed(layer, key, current)) {
        return
      }
      onChange({ ...state, cells: applyCellValue(state.cells, [key], nextValue) })
    },
    [state, onChange, activeLegendId, layer, isEraseAllowed],
  )

  const cancelActiveDraw = useCallback(() => {
    dragModeRef.current = 'none'
    setWallStart(null)
    setWallCurrent(null)
    setCircleCenter(null)
    setCircleCurrent(null)
    setRectPoints([])
    setRectCursor(null)
    setMarqueeStart(null)
    setMarqueeCurrent(null)
    setMoveOrigin(null)
    setMoveDelta({ dx: 0, dy: 0 })
    setStampHoverCell(null)
  }, [])

  // Switching tools mid-gesture (e.g. clicking a toolbar button while a
  // rectangle is half-drawn) shouldn't leave a stuck preview behind.
  useEffect(() => {
    cancelActiveDraw()
    setSelectedKeys(new Set())
    setContextMenu(null)
  }, [tool, cancelActiveDraw])

  const gatherSelection = useCallback(
    (minX: number, maxX: number, minY: number, maxY: number) => {
      const scopeLayers = layerScope === 'all' ? Object.keys(layers).map(Number) : [layer]
      const found = new Set<string>()

      for (const ln of scopeLayers) {
        const cells = layers[ln] ?? {}
        for (const [coord, value] of Object.entries(cells)) {
          const [x, y] = coord.split(',').map(Number)
          const compositeKey = `${ln}:${coord}`
          const groupId = groupMembership[compositeKey] ?? DEFAULT_GROUP_ID
          if (
            x >= minX &&
            x <= maxX &&
            y >= minY &&
            y <= maxY &&
            groupId === activeGroupId &&
            isCellActive(ln, coord, value)
          ) {
            found.add(compositeKey)
          }
        }
      }

      // Moving one cell of a group should carry the whole group with it,
      // even the parts that fall outside the marquee.
      const groupIds = new Set(
        Array.from(found)
          .map((compositeKey) => groupMembership[compositeKey])
          .filter((id): id is string => Boolean(id)),
      )
      if (groupIds.size > 0) {
        for (const ln of scopeLayers) {
          const cells = layers[ln] ?? {}
          for (const [coord, value] of Object.entries(cells)) {
            const compositeKey = `${ln}:${coord}`
            const groupId = groupMembership[compositeKey]
            if (groupId && groupIds.has(groupId) && isCellActive(ln, coord, value)) {
              found.add(compositeKey)
            }
          }
        }
      }

      return found
    },
    [layerScope, layers, layer, groupMembership, isCellActive, activeGroupId],
  )

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

      if (ctrlActive) {
        const cell = screenToCell(e.clientX, e.clientY, rect, viewTransform)
        const value = state.cells[cellKey(cell.x, cell.y)]
        onPickColor(value ?? null)
        return
      }

      setContextMenu(null)
      const local = screenToLocal(e.clientX, e.clientY, rect, viewTransform)

      if (tool === 'select') {
        const cell = screenToCell(e.clientX, e.clientY, rect, viewTransform)
        const compositeKey = `${layer}:${cellKey(cell.x, cell.y)}`
        if (selectedKeys.has(compositeKey)) {
          dragModeRef.current = 'moving-selection'
          setMoveOrigin(cell)
          setMoveDelta({ dx: 0, dy: 0 })
        } else {
          dragModeRef.current = 'marquee'
          setSelectedKeys(new Set())
          setMarqueeStart(local)
          setMarqueeCurrent(local)
        }
        return
      }

      if (tool === 'stamp') {
        if (!stamp) return
        const cell = screenToCell(e.clientX, e.clientY, rect, viewTransform)
        onPlaceStamp(stamp, cell.x, cell.y)
        return
      }

      if (tool === 'rectangle') {
        if (rectPoints.length < 2) {
          setRectPoints([...rectPoints, local])
        } else {
          const corners = orientedRectCorners(rectPoints[0], rectPoints[1], local)
          const keys = filterEraseKeys(cellsInPolygon(corners))
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
        const startValue = state.cells[cellKey(cell.x, cell.y)]
        if (activeLegendId === null && startValue !== undefined && !isEraseAllowed(layer, cellKey(cell.x, cell.y), startValue)) {
          return
        }
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
    [
      tool,
      viewTransform,
      paintCell,
      state,
      onChange,
      activeLegendId,
      rectPoints,
      ctrlActive,
      onPickColor,
      selectedKeys,
      layer,
      filterEraseKeys,
      isEraseAllowed,
      stamp,
      onPlaceStamp,
    ],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (ctrlActive) {
        const rect = svgRef.current?.getBoundingClientRect()
        if (rect) {
          const cell = screenToCell(e.clientX, e.clientY, rect, viewTransform)
          const value = state.cells[cellKey(cell.x, cell.y)]
          const entry = value ? state.legend.find((legendEntry) => legendEntry.id === value) : undefined
          const label = value ? (entry?.label ?? 'Unknown key') : 'Empty'
          setHoverInfo({ x: e.clientX, y: e.clientY, label, color: entry?.color ?? null })
        }
        return
      }

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

      if (tool === 'stamp') {
        setStampHoverCell(screenToCell(e.clientX, e.clientY, rect, viewTransform))
        return
      }

      if (dragModeRef.current === 'marquee') {
        setMarqueeCurrent(screenToLocal(e.clientX, e.clientY, rect, viewTransform))
        return
      }

      if (dragModeRef.current === 'moving-selection' && moveOrigin) {
        const cell = screenToCell(e.clientX, e.clientY, rect, viewTransform)
        setMoveDelta({ dx: cell.x - moveOrigin.x, dy: cell.y - moveOrigin.y })
        return
      }

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
    [tool, rectPoints, viewTransform, onViewTransformChange, paintCell, moveOrigin, ctrlActive, state],
  )

  const handlePointerLeave = useCallback(() => {
    setHoverInfo(null)
    setStampHoverCell(null)
  }, [])

  const handlePointerUp = useCallback(() => {
    if (dragModeRef.current === 'panning') {
      dragModeRef.current = 'none'
      return
    }

    if (dragModeRef.current === 'marquee' && marqueeStart && marqueeCurrent) {
      const minX = Math.floor(Math.min(marqueeStart.x, marqueeCurrent.x))
      const maxX = Math.floor(Math.max(marqueeStart.x, marqueeCurrent.x))
      const minY = Math.floor(Math.min(marqueeStart.y, marqueeCurrent.y))
      const maxY = Math.floor(Math.max(marqueeStart.y, marqueeCurrent.y))
      setSelectedKeys(gatherSelection(minX, maxX, minY, maxY))
      setMarqueeStart(null)
      setMarqueeCurrent(null)
      dragModeRef.current = 'none'
      return
    }

    if (dragModeRef.current === 'moving-selection') {
      if (moveDelta.dx !== 0 || moveDelta.dy !== 0) {
        onMoveSelection(Array.from(selectedKeys), moveDelta.dx, moveDelta.dy)
        setSelectedKeys(
          (prev) =>
            new Set(
              Array.from(prev).map((compositeKey) => {
                const [ln, coord] = compositeKey.split(':')
                return `${ln}:${shiftCoord(coord, moveDelta.dx, moveDelta.dy)}`
              }),
            ),
        )
      }
      setMoveOrigin(null)
      setMoveDelta({ dx: 0, dy: 0 })
      dragModeRef.current = 'none'
      return
    }

    if (dragModeRef.current === 'wall-drawing' && wallStart && wallCurrent) {
      const keys = filterEraseKeys(cellsAlongLine(wallStart.x, wallStart.y, wallCurrent.x, wallCurrent.y))
      onChange({ ...state, cells: applyCellValue(state.cells, keys, activeLegendId ?? undefined) })
    } else if (dragModeRef.current === 'circle-drawing' && circleCenter && circleCurrent) {
      const radius = Math.hypot(circleCurrent.x - circleCenter.x, circleCurrent.y - circleCenter.y)
      const keys = filterEraseKeys(cellsInCircle(circleCenter.x, circleCenter.y, radius))
      onChange({ ...state, cells: applyCellValue(state.cells, keys, activeLegendId ?? undefined) })
    }
    dragModeRef.current = 'none'
    lastPaintedRef.current = null
    setWallStart(null)
    setWallCurrent(null)
    setCircleCenter(null)
    setCircleCurrent(null)
  }, [
    wallStart,
    wallCurrent,
    circleCenter,
    circleCurrent,
    state,
    onChange,
    activeLegendId,
    marqueeStart,
    marqueeCurrent,
    gatherSelection,
    moveDelta,
    selectedKeys,
    onMoveSelection,
    filterEraseKeys,
  ])

  const isDrawInProgress = useCallback(
    () => dragModeRef.current === 'wall-drawing' || dragModeRef.current === 'circle-drawing' || rectPoints.length > 0,
    [rectPoints],
  )

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()
      if (isDrawInProgress()) {
        cancelActiveDraw()
        return
      }
      if (tool === 'select' && selectedKeys.size > 0) {
        setContextMenu({ x: e.clientX, y: e.clientY })
      }
    },
    [cancelActiveDraw, isDrawInProgress, tool, selectedKeys],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawInProgress()) cancelActiveDraw()
        setSelectedKeys(new Set())
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cancelActiveDraw, isDrawInProgress])

  useEffect(() => {
    if (!contextMenu) return
    const dismiss = () => setContextMenu(null)
    window.addEventListener('click', dismiss)
    return () => window.removeEventListener('click', dismiss)
  }, [contextMenu])

  const circleRadius =
    circleCenter && circleCurrent
      ? Math.hypot(circleCurrent.x - circleCenter.x, circleCurrent.y - circleCenter.y)
      : 0

  const rectCorners =
    rectPoints.length === 2 && rectCursor
      ? orientedRectCorners(rectPoints[0], rectPoints[1], rectCursor)
      : null

  const selectedCoordsOnLayer = Array.from(selectedKeys)
    .filter((compositeKey) => compositeKey.startsWith(`${layer}:`))
    .map((compositeKey) => compositeKey.slice(compositeKey.indexOf(':') + 1))

  const movePreviewKeys =
    dragModeRef.current === 'moving-selection'
      ? selectedCoordsOnLayer.map((coord) => shiftCoord(coord, moveDelta.dx, moveDelta.dy))
      : []

  const stampPreviewKeys =
    tool === 'stamp' && stamp && stampHoverCell
      ? Object.keys(stamp.cells).map((coord) => shiftCoord(coord, stampHoverCell.x, stampHoverCell.y))
      : []

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        className={`h-full w-full touch-none bg-slate-50 dark:bg-slate-900 ${
          tool === 'wall' || tool === 'circle' || tool === 'rectangle'
            ? 'cursor-crosshair'
            : tool === 'select' || tool === 'stamp'
              ? 'cursor-default'
              : 'cursor-cell'
        }`}
        style={ctrlActive ? { cursor: EYEDROPPER_CURSOR } : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
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
          {belowCells &&
            Object.entries(belowCells)
              .filter(([coord, value]) => isCellActive(layer - 1, coord, value))
              .map(([key, value]) => {
                const [x, y] = key.split(',').map(Number)
                return (
                  <CellRenderer
                    key={`below-${key}`}
                    x={x}
                    y={y}
                    color={resolveColor(value, state.legend)}
                    opacity={GHOST_OPACITY}
                    tint={BELOW_TINT}
                  />
                )
              })}

          {aboveCells &&
            Object.entries(aboveCells)
              .filter(([coord, value]) => isCellActive(layer + 1, coord, value))
              .map(([key, value]) => {
                const [x, y] = key.split(',').map(Number)
                return (
                  <CellRenderer
                    key={`above-${key}`}
                    x={x}
                    y={y}
                    color={resolveColor(value, state.legend)}
                    opacity={GHOST_OPACITY}
                    tint={ABOVE_TINT}
                  />
                )
              })}

          {Object.entries(state.cells)
            .filter(([coord, value]) => isCellActive(layer, coord, value))
            .map(([key, value]) => {
              const [x, y] = key.split(',').map(Number)
              return <CellRenderer key={key} x={x} y={y} color={resolveColor(value, state.legend)} />
            })}

          {selectedCoordsOnLayer.length > 0 && dragModeRef.current !== 'moving-selection' && (
            <PreviewCells keys={selectedCoordsOnLayer} />
          )}

          {movePreviewKeys.length > 0 && <PreviewCells keys={movePreviewKeys} />}

          {stampPreviewKeys.length > 0 && <PreviewCells keys={stampPreviewKeys} />}

          {marqueeStart && marqueeCurrent && (
            <rect
              x={Math.min(marqueeStart.x, marqueeCurrent.x) * CELL_SIZE}
              y={Math.min(marqueeStart.y, marqueeCurrent.y) * CELL_SIZE}
              width={Math.abs(marqueeCurrent.x - marqueeStart.x) * CELL_SIZE}
              height={Math.abs(marqueeCurrent.y - marqueeStart.y) * CELL_SIZE}
              fill="rgba(56, 189, 248, 0.15)"
              stroke={PREVIEW_STROKE}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              className={PREVIEW_CLASS}
            />
          )}

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

      {ctrlActive && hoverInfo && (
        <div
          className="pointer-events-none fixed z-30 flex items-center gap-1.5 rounded border border-slate-200 bg-white/95 px-2 py-1 text-xs font-medium text-slate-700 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200"
          style={{ left: hoverInfo.x + 18, top: hoverInfo.y + 18 }}
        >
          <span
            className="h-3 w-3 shrink-0 rounded border border-slate-300 dark:border-slate-600"
            style={
              hoverInfo.color
                ? { backgroundColor: hoverInfo.color }
                : {
                    backgroundImage:
                      'repeating-linear-gradient(45deg,#e2e8f0 0,#e2e8f0 2px,transparent 2px,transparent 4px)',
                  }
            }
          />
          {hoverInfo.label}
        </div>
      )}

      {fillWarning && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-red-600 px-3 py-1 text-sm text-white shadow">
          Can't fill an unbounded region
        </div>
      )}

      {contextMenu && (
        <div
          className="absolute z-20 w-40 rounded border border-slate-200 bg-white p-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onCopySelection(Array.from(selectedKeys))
              setContextMenu(null)
            }}
            className="w-full rounded px-2 py-1 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => {
              onSeparateSelection(Array.from(selectedKeys))
              setContextMenu(null)
            }}
            className="w-full rounded px-2 py-1 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Separate into new group
          </button>
          <button
            type="button"
            onClick={() => {
              onSaveComponent(Array.from(selectedKeys))
              setContextMenu(null)
            }}
            className="w-full rounded px-2 py-1 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Save as component
          </button>
        </div>
      )}
    </div>
  )
}

export default Canvas
