import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface DrawerProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

export function Drawer({ open, title, children, onClose }: DrawerProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="overlay-shell" role="presentation">
      <div className="overlay-backdrop" onClick={onClose} />
      <aside className="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="overlay-header">
          <h2 id="drawer-title">{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close drawer">
            ×
          </button>
        </div>
        <div className="overlay-body">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}
