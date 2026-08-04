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

export function cellsInCircle(cx: number, cy: number, radius: number): string[] {
  if (radius <= 0) return []
  const minX = Math.floor(cx - radius)
  const maxX = Math.floor(cx + radius)
  const minY = Math.floor(cy - radius)
  const maxY = Math.floor(cy + radius)
  const keys: string[] = []
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      if (dx * dx + dy * dy <= radius * radius) keys.push(cellKey(x, y))
    }
  }
  return keys
}

export interface Point {
  x: number
  y: number
}

// Derives an oriented (possibly rotated) rectangle from three points: p0 is
// a corner, p1 sets the length and direction of the first edge, and p2 sets
// the perpendicular width ("volume") on either side of that edge.
export function orientedRectCorners(p0: Point, p1: Point, p2: Point): Point[] {
  const edge = { x: p1.x - p0.x, y: p1.y - p0.y }
  const length = Math.hypot(edge.x, edge.y)
  if (length === 0) return [p0, p0, p0, p0]
  const along = { x: edge.x / length, y: edge.y / length }
  const perp = { x: -along.y, y: along.x }
  const width = (p2.x - p0.x) * perp.x + (p2.y - p0.y) * perp.y
  const p3 = { x: p0.x + perp.x * width, y: p0.y + perp.y * width }
  const p2b = { x: p1.x + perp.x * width, y: p1.y + perp.y * width }
  return [p0, p1, p2b, p3]
}

function pointInPolygon(px: number, py: number, points: Point[]): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x
    const yi = points[i].y
    const xj = points[j].x
    const yj = points[j].y
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

export function cellsInPolygon(points: Point[]): string[] {
  if (points.length < 3) return []
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.floor(Math.min(...xs))
  const maxX = Math.floor(Math.max(...xs))
  const minY = Math.floor(Math.min(...ys))
  const maxY = Math.floor(Math.max(...ys))
  const keys: string[] = []
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) keys.push(cellKey(x, y))
    }
  }
  return keys
}
