export const CELL_SIZE = 32
export const MIN_SCALE = 0.25
export const MAX_SCALE = 3

// Shared "negative outline" preview styling — mix-blend-difference inverts
// whatever is beneath it, so a white stroke reads as high-contrast marching
// ants against any background color. Used by every live drawing preview.
export const PREVIEW_STROKE = '#ffffff'
export const PREVIEW_CLASS = 'mix-blend-difference'

// Flood fill aborts (rather than filling forever) once a connected region
// exceeds this many cells — the canvas is unbounded, so an unenclosed
// empty area would otherwise fill without limit.
export const MAX_FILL_CELLS = 4000
