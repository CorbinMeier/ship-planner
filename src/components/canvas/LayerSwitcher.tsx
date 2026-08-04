interface LayerSwitcherProps {
  layer: number
  onLayerChange: (layer: number) => void
}

function LayerSwitcher({ layer, onLayerChange }: LayerSwitcherProps) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded border border-slate-200 px-1 dark:border-slate-700">
      <button
        type="button"
        onClick={() => onLayerChange(layer - 1)}
        title="Layer down"
        aria-label="Go to layer below"
        className="rounded px-1.5 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        &#8722;
      </button>

      <span
        title="Current layer"
        className="min-w-[3.5rem] text-center text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300"
      >
        Layer {layer}
      </span>

      <button
        type="button"
        onClick={() => onLayerChange(layer + 1)}
        title="Layer up"
        aria-label="Go to layer above"
        className="rounded px-1.5 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        +
      </button>
    </div>
  )
}

export default LayerSwitcher
