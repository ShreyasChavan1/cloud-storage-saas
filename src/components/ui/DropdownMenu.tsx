import { useEffect, useRef, useState, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

export interface MenuItemDef {
  label: string
  icon: ReactNode
  onSelect: () => void
  tone?: 'default' | 'danger'
}

interface DropdownMenuProps {
  trigger: ReactNode
  items: MenuItemDef[]
  align?: 'start' | 'end'
}

export function DropdownMenu({ trigger, items, align = 'end' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      )
        return
      setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      setCoords({
        top: rect.bottom + window.scrollY + 6,
        left: align === 'end' ? rect.right + window.scrollX - 180 : rect.left + window.scrollX,
      })
    }
    setOpen((o) => !o)
  }

  return (
    <>
      <div
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation()
          openMenu()
        }}
      >
        {trigger}
      </div>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-50 w-44 overflow-hidden rounded-xl border border-line bg-surface-0 py-1 shadow-soft animate-fade-up dark:border-dark-border dark:bg-dark-surface2"
          >
            {items.map((item) => (
              <button
                key={item.label}
                onClick={(e) => {
                  e.stopPropagation()
                  item.onSelect()
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors',
                  item.tone === 'danger'
                    ? 'text-danger hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-ink-700 hover:bg-surface-50 dark:text-ink-300 dark:hover:bg-dark-surface'
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}
