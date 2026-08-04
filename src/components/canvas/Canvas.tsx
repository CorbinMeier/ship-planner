import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent, WheelEvent } from 'react'
import Grid from './Grid'
import ShapeElement from './ShapeElement'
import { CELL_SIZE, MAX_SCALE, MIN_SCALE } from './constants'
import type {
  EditorState,
  ElementKind,
  ShipElement,
  ToolMode,
  ViewTransform,
} from '../../types/editor'

interface CanvasProps {
  state: EditorState
  onChange: (state: EditorState) => void
  tool: ToolMode
  elementKind: ElementKind
  viewTransform: ViewTransform
  onViewTransformChange: (viewTransform: ViewTransform) => void
}

type DragMode = 'none' | 'drawing' | 'moving'

interface DraftRect {
  x: number
  y: number
  width: number
  height: number
}

function createId() {
  return Math.random().toString(36).slice(2, 10)
}

function Canvas({
  state,
  onChange,
  tool,
  elementKind,
  viewTransform,
  onViewTransformChange,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  const dragModeRef = useRef<DragMode>('none')
  const dragStartRef = useRef({ x: 0, y: 0 })
  const moveOriginRef = useRef({ x: 0, y: 0 })
  const [draftRect, setDraftRect] = useState<DraftRect | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const screenToGrid = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      const localX = clientX - rect.left - viewTransform.offsetX
      const localY = clientY - rect.top - viewTransform.offsetY
      return {
        x: Math.floor(localX / viewTransform.scale / CELL_SIZE),
        y: Math.floor(localY / viewTransform.scale / CELL_SIZE),
      }
    },
    [viewTransform],
  )

  const handleWheel = useCallback(
    (e: WheelEvent<SVGSVGElement>) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const rect = svgRef.current?.getBoundingClientRect()
        if (!rect) return
        const cursorX = e.clientX - rect.left
        const cursorY = e.clientY - rect.top
        const factor = Math.exp(-e.deltaY * 0.002)
        const newScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, viewTransform.scale * factor),
        )
        const ratio = newScale / viewTransform.scale
        onViewTransformChange({
          scale: newScale,
          offsetX: cursorX - (cursorX - viewTransform.offsetX) * ratio,
          offsetY: cursorY - (cursorY - viewTransform.offsetY) * ratio,
        })
      } else {
        onViewTransformChange({
          ...viewTransform,
          offsetX: viewTransform.offsetX - e.deltaX,
          offsetY: viewTransform.offsetY - e.deltaY,
        })
      }
    },
    [viewTransform, onViewTransformChange],
  )

  const handleBackgroundPointerDown = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
      if (tool === 'draw') {
        const { x, y } = screenToGrid(e.clientX, e.clientY)
        dragModeRef.current = 'drawing'
        dragStartRef.current = { x, y }
        setDraftRect({ x, y, width: 0, height: 0 })
      } else {
        onChange({ ...state, selectedId: null })
      }
    },
    [tool, screenToGrid, onChange, state],
  )

  const handleShapePointerDown = useCallback(
    (e: PointerEvent<SVGRectElement>, element: ShipElement) => {
      if (tool !== 'select') return
      e.stopPropagation()
      e.currentTarget.setPointerCapture?.(e.pointerId)
      const { x, y } = screenToGrid(e.clientX, e.clientY)
      dragModeRef.current = 'moving'
      moveOriginRef.current = { x: x - element.x, y: y - element.y }
      onChange({ ...state, selectedId: element.id })
    },
    [tool, screenToGrid, onChange, state],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (dragModeRef.current === 'drawing') {
        const { x, y } = screenToGrid(e.clientX, e.clientY)
        const start = dragStartRef.current
        setDraftRect({
          x: Math.min(start.x, x),
          y: Math.min(start.y, y),
          width: Math.abs(x - start.x),
          height: Math.abs(y - start.y),
        })
      } else if (dragModeRef.current === 'moving' && state.selectedId) {
        const { x, y } = screenToGrid(e.clientX, e.clientY)
        const originOffset = moveOriginRef.current
        const nextX = x - originOffset.x
        const nextY = y - originOffset.y
        onChange({
          ...state,
          elements: state.elements.map((el) =>
            el.id === state.selectedId ? { ...el, x: nextX, y: nextY } : el,
          ),
        })
      }
    },
    [screenToGrid, state, onChange],
  )

  const handlePointerUp = useCallback(() => {
    if (dragModeRef.current === 'drawing' && draftRect) {
      if (draftRect.width >= 1 && draftRect.height >= 1) {
        const newElement: ShipElement = {
          id: createId(),
          kind: elementKind,
          x: draftRect.x,
          y: draftRect.y,
          width: draftRect.width,
          height: draftRect.height,
        }
        onChange({
          elements: [...state.elements, newElement],
          selectedId: newElement.id,
        })
      }
      setDraftRect(null)
    }
    dragModeRef.current = 'none'
  }, [draftRect, elementKind, onChange, state.elements])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedId) {
        onChange({
          elements: state.elements.filter((el) => el.id !== state.selectedId),
          selectedId: null,
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state, onChange])

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        className="h-full w-full bg-slate-50 touch-none"
        onWheel={handleWheel}
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <Grid viewTransform={viewTransform} width={size.width} height={size.height} />
        <g
          transform={`translate(${viewTransform.offsetX}, ${viewTransform.offsetY}) scale(${viewTransform.scale})`}
        >
          {state.elements.map((element) => (
            <ShapeElement
              key={element.id}
              element={element}
              selected={element.id === state.selectedId}
              onPointerDown={handleShapePointerDown}
            />
          ))}
          {draftRect && (
            <rect
              x={draftRect.x * CELL_SIZE}
              y={draftRect.y * CELL_SIZE}
              width={draftRect.width * CELL_SIZE}
              height={draftRect.height * CELL_SIZE}
              fill="none"
              strokeDasharray="4 4"
              className="stroke-brand-accent"
              strokeWidth={2}
            />
          )}
        </g>
      </svg>
    </div>
  )
}

export default Canvas
