import { Link } from 'react-router-dom'
import { MoonIcon, SunIcon } from './icons'

interface EditorHeaderProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

function EditorHeader({ theme, onToggleTheme }: EditorHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="text-sm font-semibold tracking-tight text-brand-primary dark:text-slate-100"
        >
          Ship Planner
        </Link>
        <span className="text-xs text-slate-400 dark:text-slate-500">Blueprint editor</span>
      </div>

      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  )
}

export default EditorHeader
