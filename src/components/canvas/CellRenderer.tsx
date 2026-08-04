import { CELL_SIZE } from './constants'

interface CellRendererProps {
  x: number
  y: number
  color: string
  opacity?: number
  tint?: string
}

function CellRenderer({ x, y, color, opacity, tint }: CellRendererProps) {
  return (
    <>
      <rect
        x={x * CELL_SIZE}
        y={y * CELL_SIZE}
        width={CELL_SIZE}
        height={CELL_SIZE}
        fill={color}
        opacity={opacity}
      />
      {tint && (
        <rect
          x={x * CELL_SIZE}
          y={y * CELL_SIZE}
          width={CELL_SIZE}
          height={CELL_SIZE}
          fill={tint}
          style={{ mixBlendMode: 'multiply' }}
        />
      )}
    </>
  )
}

export default CellRenderer
