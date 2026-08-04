import { CELL_SIZE } from './constants'
import type { ViewTransform } from '../../types/editor'

interface GridProps {
  viewTransform: ViewTransform
  width: number
  height: number
}

function Grid({ viewTransform, width, height }: GridProps) {
  const { offsetX, offsetY, scale } = viewTransform
  const size = CELL_SIZE
  const majorSize = size * 5

  return (
    <>
      <defs>
        <pattern
          id="grid-minor"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}
        >
          <path
            d={`M ${size} 0 L 0 0 0 ${size}`}
            fill="none"
            className="stroke-slate-300"
            strokeWidth={1}
          />
        </pattern>
        <pattern
          id="grid-major"
          width={majorSize}
          height={majorSize}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}
        >
          <rect width={majorSize} height={majorSize} fill="url(#grid-minor)" />
          <path
            d={`M ${majorSize} 0 L 0 0 0 ${majorSize}`}
            fill="none"
            className="stroke-slate-400"
            strokeWidth={1}
          />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#grid-major)" />
    </>
  )
}

export default Grid
