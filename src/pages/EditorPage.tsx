import { useState } from 'react'
import Canvas from '../components/canvas/Canvas'
import Toolbar from '../components/canvas/Toolbar'
import type { EditorState, ElementKind, ToolMode, ViewTransform } from '../types/editor'

const initialState: EditorState = {
  elements: [
    { id: 'seed-hull', kind: 'wall', x: 2, y: 2, width: 10, height: 6 },
    { id: 'seed-room', kind: 'room', x: 4, y: 3, width: 3, height: 3 },
  ],
  selectedId: null,
}

// future: floor switcher goes here, alongside a floors[] list;
// EditorState would become keyed by floorId
function EditorPage() {
  const [state, setState] = useState<EditorState>(initialState)
  const [tool, setTool] = useState<ToolMode>('select')
  const [elementKind, setElementKind] = useState<ElementKind>('wall')
  const [viewTransform, setViewTransform] = useState<ViewTransform>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  })

  const handleDeleteSelected = () => {
    if (!state.selectedId) return
    setState({
      elements: state.elements.filter((el) => el.id !== state.selectedId),
      selectedId: null,
    })
  }

  return (
    <div className="relative flex h-screen flex-col">
      <Canvas
        state={state}
        onChange={setState}
        tool={tool}
        elementKind={elementKind}
        viewTransform={viewTransform}
        onViewTransformChange={setViewTransform}
      />
      <Toolbar
        tool={tool}
        onToolChange={setTool}
        elementKind={elementKind}
        onElementKindChange={setElementKind}
        viewTransform={viewTransform}
        onViewTransformChange={setViewTransform}
        selectedId={state.selectedId}
        onDeleteSelected={handleDeleteSelected}
      />
    </div>
  )
}

export default EditorPage
