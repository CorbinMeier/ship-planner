import { useState } from 'react'
import Canvas from '../components/canvas/Canvas'
import Toolbar from '../components/canvas/Toolbar'
import Legend from '../components/canvas/Legend'
import type { EditorState, LegendEntry, ToolMode, ViewTransform } from '../types/editor'

function createId() {
  return Math.random().toString(36).slice(2, 10)
}

const initialState: EditorState = {
  cells: {},
  legend: [{ id: 'room', label: 'Room', color: '#22c55e' }],
}

// future: floor switcher goes here, alongside a floors[] list;
// EditorState would become keyed by floorId
function EditorPage() {
  const [state, setState] = useState<EditorState>(initialState)
  const [tool, setTool] = useState<ToolMode>('paint')
  const [activeLegendId, setActiveLegendId] = useState<string | null>('room')
  const [viewTransform, setViewTransform] = useState<ViewTransform>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  })

  const handleAddLegendEntry = (label: string, color: string) => {
    const entry: LegendEntry = { id: createId(), label, color }
    setState((prev) => ({ ...prev, legend: [...prev.legend, entry] }))
    setActiveLegendId(entry.id)
  }

  const handleRemoveLegendEntry = (id: string) => {
    setState((prev) => ({ ...prev, legend: prev.legend.filter((entry) => entry.id !== id) }))
    setActiveLegendId((current) => (current === id ? null : current))
  }

  return (
    <div className="relative flex h-screen flex-col">
      <Canvas
        state={state}
        onChange={setState}
        tool={tool}
        activeLegendId={activeLegendId}
        viewTransform={viewTransform}
        onViewTransformChange={setViewTransform}
      />
      <Toolbar
        tool={tool}
        onToolChange={setTool}
        viewTransform={viewTransform}
        onViewTransformChange={setViewTransform}
      />
      <Legend
        legend={state.legend}
        activeLegendId={activeLegendId}
        onSelect={setActiveLegendId}
        onAdd={handleAddLegendEntry}
        onRemove={handleRemoveLegendEntry}
      />
    </div>
  )
}

export default EditorPage
