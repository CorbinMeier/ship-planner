export type ToolMode = 'paint' | 'wall'

export interface LegendEntry {
  id: string
  label: string
  color: string
}

// References a LegendEntry.id — both Paint and Wall tools write the
// currently active legend color (or erase), so there is no separate
// "wall" cell kind; walls are just cells drawn via a line gesture.
export type CellValue = string

// Future: floors: { id: string; name: string; cells: EditorState['cells'] }[]
export interface EditorState {
  cells: Record<string, CellValue>
  legend: LegendEntry[]
}

export interface ViewTransform {
  offsetX: number
  offsetY: number
  scale: number
}
