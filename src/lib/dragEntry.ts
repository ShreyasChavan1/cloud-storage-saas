// Tiny shared contract for dragging a file/folder card to move it — one
// custom MIME type carrying just enough to validate and perform the move
// on drop, read back out with a couple of small helpers so every drop
// target parses it the same way.
const DRAG_TYPE = 'application/x-nimbus-entry'

export interface DraggedEntry {
  path: string
  name: string
  type: 'file' | 'folder'
}

export function setDragEntry(dataTransfer: DataTransfer, entry: DraggedEntry) {
  dataTransfer.setData(DRAG_TYPE, JSON.stringify(entry))
  // Harmless fallback for anything inspecting the drag outside our own
  // drop targets (e.g. browser dev tools) — not relied on for logic.
  dataTransfer.setData('text/plain', entry.path)
  dataTransfer.effectAllowed = 'move'
}

export function hasDragEntry(dataTransfer: DataTransfer): boolean {
  return dataTransfer.types.includes(DRAG_TYPE)
}

export function getDragEntry(dataTransfer: DataTransfer): DraggedEntry | null {
  try {
    const raw = dataTransfer.getData(DRAG_TYPE)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.path !== 'string' || typeof parsed?.name !== 'string') return null
    return parsed as DraggedEntry
  } catch {
    return null
  }
}
