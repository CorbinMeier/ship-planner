import { Link } from 'react-router-dom'
import Toolbar from './Toolbar'
import LayerSwitcher from './LayerSwitcher'
import ImportExportControls from './ImportExportControls'
import { GearIcon, KeyIcon, MoonIcon, StampIcon, SunIcon } from './icons'
import type { LayerScope, ToolMode, ViewTransform } from '../../types/editor'

interface EditorHeaderProps {
  tool: ToolMode
  onToolChange: (tool: ToolMode) => void
  viewTransform: ViewTransform
  onViewTransformChange: (viewTransform: ViewTransform) => void
  layerScope: LayerScope
  onLayerScopeChange: (scope: LayerScope) => void
  layer: number
  onLayerChange: (layer: number) => void
  legendVisible: boolean
  onToggleLegend: () => void
  groupsVisible: boolean
  onToggleGroups: () => void
  componentsVisible: boolean
  onToggleComponents: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onExport: () => void
  onImport: (file: File) => void
}

function EditorHeader({
  tool,
  onToolChange,
  viewTransform,
  onViewTransformChange,
  layerScope,
  onLayerScopeChange,
  layer,
  onLayerChange,
  legendVisible,
  onToggleLegend,
  groupsVisible,
  onToggleGroups,
  componentsVisible,
  onToggleComponents,
  theme,
  onToggleTheme,
  onExport,
  onImport,
}: EditorHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/"
          className="text-sm font-semibold tracking-tight text-brand-primary dark:text-slate-100"
        >
          Ship Planner
        </Link>
        <span className="text-xs text-slate-400 dark:text-slate-500">Blueprint editor</span>
      </div>

      <Toolbar
        tool={tool}
        onToolChange={onToolChange}
        viewTransform={viewTransform}
        onViewTransformChange={onViewTransformChange}
        layerScope={layerScope}
        onLayerScopeChange={onLayerScopeChange}
      />

      <LayerSwitcher layer={layer} onLayerChange={onLayerChange} />

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onToggleLegend}
          title="Toggle key"
          aria-label={legendVisible ? 'Hide key' : 'Show key'}
          aria-pressed={legendVisible}
          className={`rounded p-1.5 ${
            legendVisible
              ? 'bg-brand-accent text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <KeyIcon />
        </button>

        <button
          type="button"
          onClick={onToggleGroups}
          title="Toggle groups panel"
          aria-label={groupsVisible ? 'Hide groups' : 'Show groups'}
          aria-pressed={groupsVisible}
          className={`rounded p-1.5 ${
            groupsVisible
              ? 'bg-brand-accent text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <GearIcon />
        </button>

        <button
          type="button"
          onClick={onToggleComponents}
          title="Toggle saved components"
          aria-label={componentsVisible ? 'Hide components' : 'Show components'}
          aria-pressed={componentsVisible}
          className={`rounded p-1.5 ${
            componentsVisible
              ? 'bg-brand-accent text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <StampIcon />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        <ImportExportControls onExport={onExport} onImport={onImport} />
      </div>
    </header>
  )
}

export default EditorHeader
