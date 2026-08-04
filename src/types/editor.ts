export type ToolMode = 'select' | 'draw'
export type ElementKind = 'wall' | 'room'

export interface ShipElement {
  id: string
  kind: ElementKind
  x: number
  y: number
  width: number
  height: number
}

// Future: floors: { id: string; name: string; elements: ShipElement[] }[]
export interface EditorState {
  elements: ShipElement[]
  selectedId: string | null
}

export interface ViewTransform {
  offsetX: number
  offsetY: number
  scale: number
}
