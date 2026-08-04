import { useRef } from 'react'
import { ExportIcon, ImportIcon } from './icons'

interface ImportExportControlsProps {
  onExport: () => void
  onImport: (file: File) => void
}

function ImportExportControls({ onExport, onImport }: ImportExportControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onExport}
        title="Export plan"
        aria-label="Export plan"
        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <ExportIcon />
      </button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        title="Import plan (adds as a new group)"
        aria-label="Import plan"
        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <ImportIcon />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onImport(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export default ImportExportControls
