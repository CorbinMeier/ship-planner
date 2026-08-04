import { CELL_SIZE, PREVIEW_CLASS, PREVIEW_STROKE } from './constants'

interface PreviewCellsProps {
  keys: string[]
}

// Shared negative-outline overlay for every tool's live preview — see
// PREVIEW_CLASS/PREVIEW_STROKE for why mix-blend-difference is used.
function PreviewCells({ keys }: PreviewCellsProps) {
  return (
    <>
      {keys.map((key) => {
        const [x, y] = key.split(',').map(Number)
        return (
          <rect
            key={key}
            x={x * CELL_SIZE}
            y={y * CELL_SIZE}
            width={CELL_SIZE}
            height={CELL_SIZE}
            fill="none"
            stroke={PREVIEW_STROKE}
            strokeWidth={2}
            className={PREVIEW_CLASS}
          />
        )
      })}
    </>
  )
}

export default PreviewCells
