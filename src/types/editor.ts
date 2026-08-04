export type ToolMode = 'paint' | 'wall'

export interface LegendEntry {
  id: string
  label: string
  color: string
}

// 'wall' is a reserved value; any other string references a LegendEntry.id
export type CellValue = 'wall' | string

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
