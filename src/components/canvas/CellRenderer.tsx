import { CELL_SIZE } from './constants'

interface CellRendererProps {
  x: number
  y: number
  color: string
}

function CellRenderer({ x, y, color }: CellRendererProps) {
  return (
    <rect
      x={x * CELL_SIZE}
      y={y * CELL_SIZE}
      width={CELL_SIZE}
      height={CELL_SIZE}
      fill={color}
    />
  )
}

export default CellRenderer
