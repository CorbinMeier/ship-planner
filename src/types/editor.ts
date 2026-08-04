export type ToolMode = 'paint' | 'wall' | 'circle' | 'rectangle' | 'fill' | 'select'

export interface LegendEntry {
  id: string
  label: string
  color: string
  // Global default visibility — part of the shared/exported plan.
  visible: boolean
}

// A group is a named collection of painted cells (like a layer-editor's
// "group"): moving, hiding, or deleting a group acts on every cell tagged
// with its id, regardless of which ship layer the cell lives on.
export interface Group {
  id: string
  name: string
  visible: boolean
}

// Maps "layerNumber:x,y" -> Group.id
export type GroupMembership = Record<string, string>

export type LayerScope = 'active' | 'all'

// References a LegendEntry.id — both Paint and Wall tools write the
// currently active legend color (or erase), so there is no separate
// "wall" cell kind; walls are just cells drawn via a line gesture.
export type CellValue = string

export interface EditorState {
  cells: Record<string, CellValue>
  legend: LegendEntry[]
}

// Layers are ship decks/levels, numbered like building floors: 0 is the
// starting deck, and the plan can extend to arbitrary negative (below) or
// positive (above) layer numbers. Cells are per-layer; the legend is shared
// across all layers of a plan.
export type LayersState = Record<number, Record<string, CellValue>>

export interface ViewTransform {
  offsetX: number
  offsetY: number
  scale: number
}

// Serialized shape used by export/import. Local-only visibility overrides
// are deliberately excluded — they never leave the device that set them.
export interface ShipPlan {
  legend: LegendEntry[]
  groups: Group[]
  layers: LayersState
  groupMembership: GroupMembership
}
