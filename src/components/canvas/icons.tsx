import type { ReactNode } from 'react'

// Minimal stroke-based icons (currentColor) — no icon library dependency.
// Kept tiny and local to the editor toolbar/header.

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      {children}
    </svg>
  )
}

export function PaintIcon() {
  return (
    <IconBase>
      <path d="M12 3c-4 4-7 7.5-7 11a7 7 0 0 0 14 0c0-3.5-3-7-7-11Z" />
    </IconBase>
  )
}

export function WallIcon() {
  return (
    <IconBase>
      <path d="M4 20 20 4" />
      <circle cx="4" cy="20" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="20" cy="4" r="1.5" fill="currentColor" stroke="none" />
    </IconBase>
  )
}

export function CircleIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="8" />
    </IconBase>
  )
}

export function RectangleIcon() {
  return (
    <IconBase>
      <rect x="4" y="6" width="16" height="12" rx="1" />
    </IconBase>
  )
}

export function FillIcon() {
  return (
    <IconBase>
      <path d="m3 12 8-8 8 8-8 8-8-8Z" />
      <path d="M12 4v16" />
    </IconBase>
  )
}

export function SunIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </IconBase>
  )
}

export function MoonIcon() {
  return (
    <IconBase>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </IconBase>
  )
}

export function SelectIcon() {
  return (
    <IconBase>
      <path d="M5 3.5 12 20l2-6.5L20.5 11 5 3.5Z" strokeLinejoin="round" />
    </IconBase>
  )
}

export function EyedropperIcon() {
  return (
    <IconBase>
      <path d="m14.5 6.5 3 3M4 20l1-4 9-9 3 3-9 9-4 1Z" />
      <path d="M16 4.5 19.5 8" />
    </IconBase>
  )
}

export function GearIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </IconBase>
  )
}

export function ExportIcon() {
  return (
    <IconBase>
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </IconBase>
  )
}

export function ImportIcon() {
  return (
    <IconBase>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </IconBase>
  )
}

export function KeyIcon() {
  return (
    <IconBase>
      <circle cx="7" cy="15" r="3.5" />
      <path d="M9.5 12.5 19 3M16 6l2 2M18.5 3.5l2 2" />
    </IconBase>
  )
}
