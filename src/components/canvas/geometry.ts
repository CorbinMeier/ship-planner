import { CELL_SIZE } from './constants'
import type { ViewTransform } from '../../types/editor'

export function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

// Continuous grid-unit coordinates (not floored) — used for the live wall
// preview line, which must not snap while dragging.
export function screenToLocal(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewTransform: ViewTransform,
) {
  return {
    x: (clientX - rect.left - viewTransform.offsetX) / viewTransform.scale / CELL_SIZE,
    y: (clientY - rect.top - viewTransform.offsetY) / viewTransform.scale / CELL_SIZE,
  }
}

export function screenToCell(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewTransform: ViewTransform,
) {
  const local = screenToLocal(clientX, clientY, rect, viewTransform)
  return { x: Math.floor(local.x), y: Math.floor(local.y) }
}

// Samples the segment finely enough to catch every grid cell it passes
// through, including diagonals — good enough for a hand-drawn wall line.
export function cellsAlongLine(x1: number, y1: number, x2: number, y2: number): string[] {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy)
  const steps = Math.max(1, Math.ceil(length * 8))
  const seen = new Set<string>()
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    seen.add(cellKey(Math.floor(x1 + dx * t), Math.floor(y1 + dy * t)))
  }
  return [...seen]
}
