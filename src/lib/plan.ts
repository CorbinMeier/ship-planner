import type { Group, GroupMembership, LayersState, LegendEntry, ShipPlan } from '../types/editor'

export function createId() {
  return Math.random().toString(36).slice(2, 10)
}

export function downloadPlan(plan: ShipPlan, filename: string) {
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.json') ? filename : `${filename}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function isShipPlan(value: unknown): value is ShipPlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Record<string, unknown>
  return Array.isArray(plan.legend) && typeof plan.layers === 'object' && plan.layers !== null
}

export function parsePlan(json: string): ShipPlan {
  const parsed: unknown = JSON.parse(json)
  if (!isShipPlan(parsed)) throw new Error('File is not a recognized ship plan export')
  return {
    legend: parsed.legend,
    groups: Array.isArray(parsed.groups) ? parsed.groups : [],
    layers: parsed.layers,
    groupMembership:
      typeof parsed.groupMembership === 'object' && parsed.groupMembership !== null
        ? parsed.groupMembership
        : {},
  }
}

interface MergeResult {
  legend: LegendEntry[]
  layers: LayersState
  groupMembership: GroupMembership
  group: Group
}

// Every import lands as its own new, independent group/object — cells keep
// their original coordinates on whichever layer number they came from, and
// legend entries are appended (never overwritten) so imported plans never
// clobber the current key.
export function mergeImportedPlan(
  current: { legend: LegendEntry[]; layers: LayersState },
  imported: ShipPlan,
  groupName: string,
): MergeResult {
  const idMap = new Map<string, string>()
  const legend = [...current.legend]

  for (const entry of imported.legend) {
    const collides = legend.some((existing) => existing.id === entry.id)
    const newId = collides ? createId() : entry.id
    idMap.set(entry.id, newId)
    legend.push({ ...entry, id: newId })
  }

  const layers: LayersState = { ...current.layers }
  const groupMembership: GroupMembership = {}
  const group: Group = { id: createId(), name: groupName, visible: true }

  for (const [layerKey, cells] of Object.entries(imported.layers)) {
    const layerNum = Number(layerKey)
    const remapped: Record<string, string> = { ...(layers[layerNum] ?? {}) }
    for (const [cellKey, value] of Object.entries(cells)) {
      const mappedValue = idMap.get(value) ?? value
      remapped[cellKey] = mappedValue
      groupMembership[`${layerNum}:${cellKey}`] = group.id
    }
    layers[layerNum] = remapped
  }

  return { legend, layers, groupMembership, group }
}
