import type { Stamp } from '../types/editor'

const STORAGE_KEY = 'ship-planner:stamps'

export function loadStamps(): Stamp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Stamp[]) : []
  } catch {
    return []
  }
}

export function saveStamps(stamps: Stamp[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stamps))
}
