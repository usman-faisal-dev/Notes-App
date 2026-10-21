import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null)
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState(null)
  const [position, setPosition] = useState({ top: y, left: x })

  useEffect(() => {
    // Measure and clamp within viewport bounds
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const winW = window.innerWidth
      const winH = window.innerHeight

      let left = x
      let top = y

      if (left + rect.width > winW - 12) {
        left = Math.max(12, winW - rect.width - 12)
      }
      if (top + rect.height > winH - 12) {
        top = Math.max(12, winH - rect.height - 12)
      }

      setPosition({ top, left })
    }
  }, [x, y])

  // Attach outside click listener with safe delay so current right-click doesn't close it immediately
  useEffect(() => {
    let active = true

    const handlePointerDown = (e) => {
      // Ignore if clicking inside the menu or its submenus
      if (menuRef.current && menuRef.current.contains(e.target)) {
        return
      }
      onClose()
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const timer = setTimeout(() => {
      if (!active) return
      window.addEventListener('pointerdown', handlePointerDown, true)
      window.addEventListener('keydown', handleKeyDown, true)
    }, 80)

    return () => {
      active = false
      clearTimeout(timer)
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [onClose])

  const menuElement = (
    <div
      ref={menuRef}
      className="custom-context-menu"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        position: 'fixed',
        zIndex: 999999
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {items.map((item, idx) => {
        if (item.type === 'divider') {
          return <div key={idx} className="context-menu-divider" />
        }

        const hasSubmenu = Boolean(item.submenu && item.submenu.length > 0)
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
                e.stopPropagation()
                if (item.disabled || hasSubmenu) return
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
              <div 
                className="custom-context-submenu"
                onClick={(e) => e.stopPropagation()}
              >
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
                        e.stopPropagation()
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

  return createPortal(menuElement, document.body)
}
