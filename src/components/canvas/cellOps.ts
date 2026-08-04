import { MAX_FILL_CELLS } from './constants'
import { cellKey } from './geometry'
import type { CellValue } from '../../types/editor'

export function applyCellValue(
  cells: Record<string, CellValue>,
  keys: Iterable<string>,
  value: string | undefined,
): Record<string, CellValue> {
  const next = { ...cells }
  for (const key of keys) {
    if (value === undefined) {
      delete next[key]
    } else {
      next[key] = value
    }
  }
  return next
}

const NEIGHBOR_OFFSETS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

// 4-connected flood fill from (startX, startY), matching cells that share
// the clicked cell's current value (including "empty"). Returns null if the
// region can't be bounded within MAX_FILL_CELLS — the canvas is infinite,
// so an unenclosed empty area would otherwise fill forever.
export function floodFillCells(
  cells: Record<string, CellValue>,
  startX: number,
  startY: number,
): string[] | null {
  const startKey = cellKey(startX, startY)
  const targetValue = cells[startKey]
  const visited = new Set<string>([startKey])
  const queue: [number, number][] = [[startX, startY]]
  const result: string[] = [startKey]

  while (queue.length > 0) {
    const next = queue.shift()
    if (!next) break
    const [x, y] = next
    for (const [dx, dy] of NEIGHBOR_OFFSETS) {
      const nx = x + dx
      const ny = y + dy
      const key = cellKey(nx, ny)
      if (visited.has(key)) continue
      if (cells[key] !== targetValue) continue
      visited.add(key)
      result.push(key)
      if (result.length > MAX_FILL_CELLS) return null
      queue.push([nx, ny])
    }
  }
  return result
}
