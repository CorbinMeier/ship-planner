import type { PointerEvent } from 'react'
import { CELL_SIZE } from './constants'
import type { ShipElement } from '../../types/editor'

interface ShapeElementProps {
  element: ShipElement
  selected: boolean
  onPointerDown: (e: PointerEvent<SVGRectElement>, element: ShipElement) => void
}

function ShapeElement({ element, selected, onPointerDown }: ShapeElementProps) {
  const isWall = element.kind === 'wall'

  return (
    <rect
      x={element.x * CELL_SIZE}
      y={element.y * CELL_SIZE}
      width={element.width * CELL_SIZE}
      height={element.height * CELL_SIZE}
      fill={isWall ? 'none' : undefined}
      className={
        isWall
          ? 'stroke-brand-secondary'
          : 'fill-brand-accent/10 stroke-brand-secondary'
      }
      strokeWidth={isWall ? 4 : 2}
      onPointerDown={(e) => onPointerDown(e, element)}
      style={{
        outline: selected ? '2px dashed var(--color-brand-accent)' : undefined,
        outlineOffset: selected ? 2 : undefined,
        cursor: 'pointer',
      }}
    />
  )
}

export default ShapeElement
