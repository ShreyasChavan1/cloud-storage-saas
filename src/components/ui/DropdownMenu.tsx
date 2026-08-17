import { useEffect, useRef, useState, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

export interface MenuItemDef {
  label: string
  icon: ReactNode
  onSelect: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
}
interface DropdownMenuProps { trigger: ReactNode; items: MenuItemDef[]; align?: 'start' | 'end' }

const MENU_WIDTH = 176 // matches the w-44 class below
const ITEM_HEIGHT = 36 // px-3.5 py-2 + text-sm line-height, matches the item button below
const MENU_VERTICAL_PADDING = 8 // container's py-1 (top + bottom)
const VIEWPORT_MARGIN = 8 // never let the menu touch the edge of the screen

export function DropdownMenu({ trigger, items, align = 'end' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      // The menu is positioned with `fixed`, so these coordinates are
      // already viewport-relative — no window.scrollY offset needed (and
      // adding one, as a previous version of this did, made the menu
      // drift further from the trigger the more the page was scrolled).
      const estimatedHeight = items.length * ITEM_HEIGHT + MENU_VERTICAL_PADDING
      const fitsBelow = rect.bottom + 6 + estimatedHeight <= window.innerHeight - VIEWPORT_MARGIN
      const top = fitsBelow
        ? rect.bottom + 6
        : Math.max(VIEWPORT_MARGIN, rect.top - estimatedHeight - 6)

      const rawLeft = align === 'end' ? rect.right - MENU_WIDTH : rect.left
      const left = Math.min(
        Math.max(rawLeft, VIEWPORT_MARGIN),
        window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN
      )

      setCoords({ top, left })
    }
    setOpen((o) => !o)
  }

  return (
    <>
      <div ref={triggerRef} onClick={(e) => { e.stopPropagation(); openMenu() }}>{trigger}</div>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{ top: coords.top, left: coords.left, width: MENU_WIDTH }}
          className="fixed z-50 overflow-hidden rounded-xl border border-line bg-surface-0 py-1 shadow-soft animate-fade-up dark:border-dark-border dark:bg-dark-surface2"
        >
          {items.map((item) => (
            <button key={item.label} disabled={item.disabled} onClick={(e) => { e.stopPropagation(); if (!item.disabled) { item.onSelect(); setOpen(false) } }}
              className={cn('flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors',
                item.disabled ? 'cursor-not-allowed opacity-40' : item.tone === 'danger' ? 'text-danger hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-ink-700 hover:bg-surface-50 dark:text-ink-300 dark:hover:bg-dark-surface')}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>, document.body
      )}
    </>
  )
}
