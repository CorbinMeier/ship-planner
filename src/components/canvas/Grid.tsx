import { CELL_SIZE } from './constants'
import type { ViewTransform } from '../../types/editor'

interface GridProps {
  viewTransform: ViewTransform
  viewportWidth: number
  viewportHeight: number
}

// Rendered inside the same <g transform=...> as the cells (see Canvas.tsx),
// so the grid and cell fills share one transform and can never drift apart.
// The pattern itself is untransformed; only the covering rect's local
// bounds are recomputed from the inverse of the shared transform so it
// always spans the visible viewport regardless of pan/zoom.
function Grid({ viewTransform, viewportWidth, viewportHeight }: GridProps) {
  const { offsetX, offsetY, scale } = viewTransform
  const majorSize = CELL_SIZE * 5

  const localX = -offsetX / scale
  const localY = -offsetY / scale
  const localWidth = viewportWidth / scale
  const localHeight = viewportHeight / scale

  return (
    <>
      <defs>
        <pattern id="grid-minor" width={CELL_SIZE} height={CELL_SIZE} patternUnits="userSpaceOnUse">
          <path
            d={`M ${CELL_SIZE} 0 L 0 0 0 ${CELL_SIZE}`}
            fill="none"
            className="stroke-slate-300 dark:stroke-slate-700"
            strokeWidth={1}
          />
        </pattern>
        <pattern id="grid-major" width={majorSize} height={majorSize} patternUnits="userSpaceOnUse">
          <rect width={majorSize} height={majorSize} fill="url(#grid-minor)" />
          <path
            d={`M ${majorSize} 0 L 0 0 0 ${majorSize}`}
            fill="none"
            className="stroke-slate-400 dark:stroke-slate-600"
            strokeWidth={1}
          />
        </pattern>
      </defs>
      <rect x={localX} y={localY} width={localWidth} height={localHeight} fill="url(#grid-major)" />
    </>
  )
}

export default Grid
