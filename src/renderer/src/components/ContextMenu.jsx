import React, { useEffect, useRef, useState } from 'react'

export default function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null)
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState(null)
  const [adjustedPosition, setAdjustedPosition] = useState({ top: y, left: x })

  useEffect(() => {
    // Clamp position within window bounds
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect()
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight

      let left = x
      let top = y

      if (left + menuRect.width > windowWidth - 10) {
        left = windowWidth - menuRect.width - 10
      }
      if (top + menuRect.height > windowHeight - 10) {
        top = windowHeight - menuRect.height - 10
      }

      setAdjustedPosition({ top, left })
    }
  }, [x, y])

  // Close on outside click or Escape
  useEffect(() => {
    const handleDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', handleDown)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousedown', handleDown)
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="custom-context-menu"
      style={{
        top: `${adjustedPosition.top}px`,
        left: `${adjustedPosition.left}px`,
        position: 'fixed',
        zIndex: 99999
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, idx) => {
        if (item.type === 'divider') {
          return <div key={idx} className="context-menu-divider" />
        }

        const hasSubmenu = item.submenu && item.submenu.length > 0
        const isSubmenuOpen = activeSubmenuIndex === idx

        return (
          <div
            key={idx}
            className="context-menu-item-wrapper"
            onMouseEnter={() => hasSubmenu && setActiveSubmenuIndex(idx)}
            onMouseLeave={() => hasSubmenu && setActiveSubmenuIndex(null)}
          >
            <button
              className={`context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
              disabled={item.disabled}
              onClick={(e) => {
                if (item.disabled) return
                if (hasSubmenu) return
                item.action?.(e)
                onClose()
              }}
            >
              <div className="context-menu-item-left">
                {item.icon && <span className="context-menu-icon">{item.icon}</span>}
                <span className="context-menu-label">{item.label}</span>
              </div>
              {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
              {hasSubmenu && <span className="context-menu-arrow">›</span>}
            </button>

            {/* Submenu */}
            {hasSubmenu && isSubmenuOpen && (
              <div className="custom-context-submenu">
                {item.submenu.map((sub, sIdx) => {
                  if (sub.type === 'divider') {
                    return <div key={sIdx} className="context-menu-divider" />
                  }
                  return (
                    <button
                      key={sIdx}
                      className="context-menu-item"
                      disabled={sub.disabled}
                      onClick={(e) => {
                        if (sub.disabled) return
                        sub.action?.(e)
                        onClose()
                      }}
                    >
                      <div className="context-menu-item-left">
                        {sub.icon && <span className="context-menu-icon">{sub.icon}</span>}
                        <span className="context-menu-label">{sub.label}</span>
                      </div>
                      {sub.shortcut && <span className="context-menu-shortcut">{sub.shortcut}</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
