import { useEffect, useRef, useState } from 'react'
import Canvas from '../components/canvas/Canvas'
import Legend from '../components/canvas/Legend'
import GroupsPanel from '../components/canvas/GroupsPanel'
import EditorHeader from '../components/canvas/EditorHeader'
import { useTheme } from '../lib/useTheme'
import ComponentsPanel from '../components/canvas/ComponentsPanel'
import { DEFAULT_GROUP_ID } from '../components/canvas/constants'
import { createId, downloadPlan, mergeImportedPlan, parsePlan } from '../lib/plan'
import { loadStamps, saveStamps } from '../lib/stamps'
import type {
  EditorState,
  Group,
  GroupMembership,
  LayerScope,
  LayersState,
  LegendEntry,
  ShipPlan,
  Stamp,
  ToolMode,
  ViewTransform,
} from '../types/editor'

const initialLegend: LegendEntry[] = [
  { id: 'room', label: 'Room', color: '#64748b', visible: true },
]

const initialGroups: Group[] = [{ id: DEFAULT_GROUP_ID, name: 'Ungrouped', visible: true }]

function EditorPage() {
  const { theme, toggleTheme } = useTheme()
  const [legend, setLegend] = useState<LegendEntry[]>(initialLegend)
  // Local-only visibility overrides, keyed by legend id. Never exported —
  // they belong to this device, not the shared plan.
  const [localHidden, setLocalHidden] = useState<Record<string, boolean>>({})
  const [layers, setLayers] = useState<LayersState>({ 0: {} })
  const [groups, setGroups] = useState<Group[]>(initialGroups)
  const [groupMembership, setGroupMembership] = useState<GroupMembership>({})
  const [activeGroupId, setActiveGroupId] = useState(DEFAULT_GROUP_ID)
  const [layer, setLayer] = useState(0)
  const [layerScope, setLayerScope] = useState<LayerScope>('all')
  const [tool, setTool] = useState<ToolMode>('paint')
  const [activeLegendId, setActiveLegendId] = useState<string | null>('room')
  const [legendVisible, setLegendVisible] = useState(true)
  const [groupsVisible, setGroupsVisible] = useState(false)
  const [stamps, setStamps] = useState<Stamp[]>(() => loadStamps())
  const [activeStampId, setActiveStampId] = useState<string | null>(null)
  const [componentsVisible, setComponentsVisible] = useState(false)
  const [pickerToast, setPickerToast] = useState<string | null>(null)
  const [viewTransform, setViewTransform] = useState<ViewTransform>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  })

  // Effective legend passed to the canvas: local override wins over the
  // global default, so hiding a key "for me" doesn't require touching the
  // shared plan.
  const effectiveLegend: LegendEntry[] = legend.map((entry) => ({
    ...entry,
    visible: localHidden[entry.id] ?? entry.visible,
  }))

  const state: EditorState = { cells: layers[layer] ?? {}, legend: effectiveLegend }
  const belowCells = layers[layer - 1]
  const aboveCells = layers[layer + 1]

  const handleStateChange = (next: EditorState) => {
    const prevCells = layers[layer] ?? {}
    setLayers((prev) => ({ ...prev, [layer]: next.cells }))
    setGroupMembership((prev) => {
      const copy = { ...prev }
      for (const key of Object.keys(next.cells)) {
        const compositeKey = `${layer}:${key}`
        if (!(compositeKey in copy)) copy[compositeKey] = activeGroupId
      }
      for (const key of Object.keys(prevCells)) {
        if (!(key in next.cells)) delete copy[`${layer}:${key}`]
      }
      return copy
    })
  }

  // Remembers the last non-eraser legend selection so pressing 'e' again
  // (or reselecting eraser) restores it instead of losing the pick.
  const lastLegendIdRef = useRef<string | null>(activeLegendId)
  useEffect(() => {
    if (activeLegendId !== null) lastLegendIdRef.current = activeLegendId
  }, [activeLegendId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === 'e' || e.key === 'E') {
        setActiveLegendId((current) => (current === null ? lastLegendIdRef.current : null))
      } else if (e.key === 'k' || e.key === 'K') {
        setLegendVisible((visible) => !visible)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleAddLegendEntry = (label: string, color: string) => {
    const entry: LegendEntry = { id: createId(), label, color, visible: true }
    setLegend((prev) => [...prev, entry])
    setActiveLegendId(entry.id)
  }

  const handleRemoveLegendEntry = (id: string) => {
    setLegend((prev) => prev.filter((entry) => entry.id !== id))
    setActiveLegendId((current) => (current === id ? null : current))
  }

  const handleToggleLocalVisible = (id: string) => {
    setLocalHidden((prev) => {
      const entry = legend.find((e) => e.id === id)
      const current = prev[id] ?? entry?.visible ?? true
      return { ...prev, [id]: !current }
    })
  }

  const handleToggleGlobalVisible = (id: string) => {
    setLegend((prev) => prev.map((entry) => (entry.id === id ? { ...entry, visible: !entry.visible } : entry)))
  }

  const handleRenameLegendEntry = (id: string, label: string) => {
    setLegend((prev) => prev.map((entry) => (entry.id === id ? { ...entry, label } : entry)))
  }

  const handlePickColor = (legendId: string | null) => {
    setActiveLegendId(legendId)
    const label = legendId ? legend.find((entry) => entry.id === legendId)?.label : 'Eraser'
    if (!label) return
    setPickerToast(label)
    window.setTimeout(() => setPickerToast(null), 1500)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(label))
    }
  }

  // --- Groups ---

  const handleSetActiveGroup = (id: string) => setActiveGroupId(id)

  const handleToggleGroupVisible = (id: string) => {
    setGroups((prev) => prev.map((group) => (group.id === id ? { ...group, visible: !group.visible } : group)))
  }

  const handleRenameGroup = (id: string, name: string) => {
    setGroups((prev) => prev.map((group) => (group.id === id ? { ...group, name } : group)))
  }

  const handleCreateGroup = () => {
    const newGroupId = createId()
    setGroups((prev) => [...prev, { id: newGroupId, name: `Group ${prev.length}`, visible: true }])
    setActiveGroupId(newGroupId)
  }

  const handleDeleteGroup = (id: string) => {
    setLayers((prev) => {
      const next: LayersState = {}
      for (const [layerKey, cells] of Object.entries(prev)) {
        const ln = Number(layerKey)
        const filtered = { ...cells }
        for (const key of Object.keys(cells)) {
          if (groupMembership[`${ln}:${key}`] === id) delete filtered[key]
        }
        next[ln] = filtered
      }
      return next
    })
    setGroupMembership((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        if (next[key] === id) delete next[key]
      }
      return next
    })
    setGroups((prev) => prev.filter((group) => group.id !== id))
    setActiveGroupId((current) => (current === id ? DEFAULT_GROUP_ID : current))
  }

  const handleMergeGroups = (ids: string[]) => {
    const [target, ...rest] = ids
    if (!target || rest.length === 0) return
    setGroupMembership((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        if (rest.includes(next[key])) next[key] = target
      }
      return next
    })
    setGroups((prev) => prev.filter((group) => !rest.includes(group.id)))
  }

  // --- Select & move tool ---

  const handleMoveSelection = (keys: string[], dx: number, dy: number) => {
    const byLayer = new Map<number, string[]>()
    for (const compositeKey of keys) {
      const separatorIndex = compositeKey.indexOf(':')
      const ln = Number(compositeKey.slice(0, separatorIndex))
      const coord = compositeKey.slice(separatorIndex + 1)
      if (!byLayer.has(ln)) byLayer.set(ln, [])
      byLayer.get(ln)!.push(coord)
    }

    setLayers((prev) => {
      const next = { ...prev }
      for (const [ln, coords] of byLayer) {
        const cells = { ...(next[ln] ?? {}) }
        const moved: [string, string][] = []
        for (const coord of coords) {
          const value = cells[coord]
          if (value === undefined) continue
          delete cells[coord]
          const [x, y] = coord.split(',').map(Number)
          moved.push([`${x + dx},${y + dy}`, value])
        }
        for (const [newKey, value] of moved) cells[newKey] = value
        next[ln] = cells
      }
      return next
    })

    setGroupMembership((prev) => {
      const next = { ...prev }
      for (const compositeKey of keys) {
        const groupId = next[compositeKey]
        delete next[compositeKey]
        if (groupId === undefined) continue
        const separatorIndex = compositeKey.indexOf(':')
        const ln = compositeKey.slice(0, separatorIndex)
        const coord = compositeKey.slice(separatorIndex + 1)
        const [x, y] = coord.split(',').map(Number)
        next[`${ln}:${x + dx},${y + dy}`] = groupId
      }
      return next
    })
  }

  // Copies the selection 2 cells down-right into a brand-new group, so the
  // copy can immediately be dragged into place with the move gesture.
  const handleCopySelection = (keys: string[]) => {
    const newGroupId = createId()
    setGroups((prev) => [...prev, { id: newGroupId, name: `Copy ${prev.length}`, visible: true }])

    setLayers((prev) => {
      const next = { ...prev }
      for (const compositeKey of keys) {
        const separatorIndex = compositeKey.indexOf(':')
        const ln = Number(compositeKey.slice(0, separatorIndex))
        const coord = compositeKey.slice(separatorIndex + 1)
        const value = (prev[ln] ?? {})[coord]
        if (value === undefined) continue
        const [x, y] = coord.split(',').map(Number)
        next[ln] = { ...(next[ln] ?? {}), [`${x + 2},${y + 2}`]: value }
      }
      return next
    })

    setGroupMembership((prev) => {
      const next = { ...prev }
      for (const compositeKey of keys) {
        const separatorIndex = compositeKey.indexOf(':')
        const ln = compositeKey.slice(0, separatorIndex)
        const coord = compositeKey.slice(separatorIndex + 1)
        const [x, y] = coord.split(',').map(Number)
        next[`${ln}:${x + 2},${y + 2}`] = newGroupId
      }
      return next
    })
  }

  const handleSeparateSelection = (keys: string[]) => {
    const newGroupId = createId()
    setGroups((prev) => [...prev, { id: newGroupId, name: `Group ${prev.length}`, visible: true }])
    setGroupMembership((prev) => {
      const next = { ...prev }
      for (const compositeKey of keys) next[compositeKey] = newGroupId
      return next
    })
  }

  // --- Saved components (stamp tool) ---

  // Captures the selection's cells on the current layer only — a component
  // is a single-layer stencil — normalized so its top-left cell is (0,0).
  const handleSaveComponent = (keys: string[]) => {
    const layerPrefix = `${layer}:`
    const layerCells = layers[layer] ?? {}
    const coords = keys
      .filter((compositeKey) => compositeKey.startsWith(layerPrefix))
      .map((compositeKey) => compositeKey.slice(layerPrefix.length))
      .filter((coord) => layerCells[coord] !== undefined)

    if (coords.length === 0) {
      window.alert('Select cells on the current layer to save as a component.')
      return
    }

    const name = window.prompt('Component name?', 'Component')
    if (!name) return

    let minX = Infinity
    let minY = Infinity
    for (const coord of coords) {
      const [x, y] = coord.split(',').map(Number)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
    }

    const cells: Record<string, string> = {}
    const usedIds = new Set<string>()
    for (const coord of coords) {
      const [x, y] = coord.split(',').map(Number)
      const value = layerCells[coord]
      cells[`${x - minX},${y - minY}`] = value
      usedIds.add(value)
    }

    const stamp: Stamp = {
      id: createId(),
      name,
      legend: legend.filter((entry) => usedIds.has(entry.id)),
      cells,
    }
    setStamps((prev) => {
      const next = [...prev, stamp]
      saveStamps(next)
      return next
    })
    setComponentsVisible(true)
  }

  const handleSelectStamp = (id: string | null) => setActiveStampId(id)

  const handleRenameStamp = (id: string, name: string) => {
    setStamps((prev) => {
      const next = prev.map((stamp) => (stamp.id === id ? { ...stamp, name } : stamp))
      saveStamps(next)
      return next
    })
  }

  const handleDeleteStamp = (id: string) => {
    setStamps((prev) => {
      const next = prev.filter((stamp) => stamp.id !== id)
      saveStamps(next)
      return next
    })
    setActiveStampId((current) => (current === id ? null : current))
  }

  // Places a stamp's cells at the clicked origin on the current layer as a
  // brand-new group — bringing along any legend entries it references that
  // no longer exist locally, same idea as an import.
  const handlePlaceStamp = (stamp: Stamp, originX: number, originY: number) => {
    setLegend((prev) => {
      const existingIds = new Set(prev.map((entry) => entry.id))
      const missing = stamp.legend.filter((entry) => !existingIds.has(entry.id))
      return missing.length > 0 ? [...prev, ...missing] : prev
    })

    const newGroupId = createId()
    setGroups((prev) => [...prev, { id: newGroupId, name: stamp.name, visible: true }])

    setLayers((prev) => {
      const cells = { ...(prev[layer] ?? {}) }
      for (const [coord, value] of Object.entries(stamp.cells)) {
        const [x, y] = coord.split(',').map(Number)
        cells[`${x + originX},${y + originY}`] = value
      }
      return { ...prev, [layer]: cells }
    })

    setGroupMembership((prev) => {
      const next = { ...prev }
      for (const coord of Object.keys(stamp.cells)) {
        const [x, y] = coord.split(',').map(Number)
        next[`${layer}:${x + originX},${y + originY}`] = newGroupId
      }
      return next
    })
  }

  // --- Import / export ---

  const handleExport = () => {
    const plan: ShipPlan = { legend, groups, layers, groupMembership }
    downloadPlan(plan, 'ship-plan')
  }

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const imported = parsePlan(text)
      const groupName = file.name.replace(/\.json$/i, '')
      const result = mergeImportedPlan({ legend, layers }, imported, groupName)
      setLegend(result.legend)
      setLayers(result.layers)
      setGroupMembership((prev) => ({ ...prev, ...result.groupMembership }))
      setGroups((prev) => [...prev, result.group])
    } catch (err) {
      window.alert(`Could not import file: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <EditorHeader
        tool={tool}
        onToolChange={setTool}
        viewTransform={viewTransform}
        onViewTransformChange={setViewTransform}
        layerScope={layerScope}
        onLayerScopeChange={setLayerScope}
        layer={layer}
        onLayerChange={setLayer}
        legendVisible={legendVisible}
        onToggleLegend={() => setLegendVisible((visible) => !visible)}
        groupsVisible={groupsVisible}
        onToggleGroups={() => setGroupsVisible((visible) => !visible)}
        componentsVisible={componentsVisible}
        onToggleComponents={() => setComponentsVisible((visible) => !visible)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onExport={handleExport}
        onImport={handleImport}
      />
      <div className="relative flex-1">
        <Canvas
          state={state}
          onChange={handleStateChange}
          tool={tool}
          activeLegendId={activeLegendId}
          viewTransform={viewTransform}
          onViewTransformChange={setViewTransform}
          belowCells={belowCells}
          aboveCells={aboveCells}
          layer={layer}
          layers={layers}
          groups={groups}
          groupMembership={groupMembership}
          activeGroupId={activeGroupId}
          layerScope={layerScope}
          onMoveSelection={handleMoveSelection}
          onCopySelection={handleCopySelection}
          onSeparateSelection={handleSeparateSelection}
          onSaveComponent={handleSaveComponent}
          onPickColor={handlePickColor}
          stamp={activeStampId ? (stamps.find((stamp) => stamp.id === activeStampId) ?? null) : null}
          onPlaceStamp={handlePlaceStamp}
        />
        {componentsVisible && (
          <div className="absolute left-4 top-4">
            <ComponentsPanel
              stamps={stamps}
              activeStampId={activeStampId}
              onSelect={handleSelectStamp}
              onRename={handleRenameStamp}
              onDelete={handleDeleteStamp}
            />
          </div>
        )}
        {legendVisible && (
          <Legend
            legend={legend}
            localHidden={localHidden}
            activeLegendId={activeLegendId}
            onSelect={setActiveLegendId}
            onAdd={handleAddLegendEntry}
            onRemove={handleRemoveLegendEntry}
            onToggleLocalVisible={handleToggleLocalVisible}
            onToggleGlobalVisible={handleToggleGlobalVisible}
            onRename={handleRenameLegendEntry}
          />
        )}
        {groupsVisible && (
          <div className={`absolute right-4 ${legendVisible ? 'top-[22rem]' : 'top-4'}`}>
            <GroupsPanel
              groups={groups}
              activeGroupId={activeGroupId}
              onSetActive={handleSetActiveGroup}
              onToggleVisible={handleToggleGroupVisible}
              onRename={handleRenameGroup}
              onCreate={handleCreateGroup}
              onDelete={handleDeleteGroup}
              onMerge={handleMergeGroups}
            />
          </div>
        )}
        {pickerToast && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-slate-800 px-3 py-1 text-sm text-white shadow">
            {pickerToast}
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorPage
