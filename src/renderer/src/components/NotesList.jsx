import React, { useState } from 'react'
import { 
  Search, 
  Pin, 
  Trash2, 
  RotateCcw, 
  List, 
  LayoutGrid, 
  SquarePen, 
  PanelLeft, 
  Columns,
  Lock,
  Unlock,
  Copy,
  Share2,
  FolderInput,
  Folder
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import ContextMenu from './ContextMenu'

function formatNoteDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (isToday(date)) {
    return format(date, 'h:mm a')
  }
  if (isYesterday(date)) {
    return 'Yesterday'
  }
  return format(date, 'M/d/yy')
}

export default function NotesList({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onDuplicateNote,
  onTogglePin,
  onToggleLock,
  onMoveNote,
  onShareNote,
  onTrashNote,
  folders,
  searchQuery,
  setSearchQuery,
  activeFilter,
  onEmptyTrash,
  onRestoreNote,
  onPermanentDelete,
  viewMode,
  setViewMode,
  isCollapsed,
  onToggleCollapse,
  sidebarCollapsed,
  onToggleSidebar
}) {
  const [contextMenu, setContextMenu] = useState(null)
  const isTrashView = activeFilter.type === 'trash'

  const handleCardContextMenu = (e, note) => {
    e.preventDefault()
    e.stopPropagation()

    // Select note on right click if not selected
    if (selectedNoteId !== note.id) {
      onSelectNote(note.id)
    }

    const isPinned = note.is_pinned === 1
    const isLocked = note.is_locked === 1

    const folderSubmenu = (folders || []).map(f => ({
      label: f.name,
      icon: <Folder size={14} color={f.color || '#ffd60a'} />,
      disabled: note.folder_id === f.id,
      action: () => onMoveNote(note.id, f.id)
    }))

    const menuItems = isTrashView ? [
      {
        label: 'Restore Note',
        icon: <RotateCcw size={14} color="var(--accent-blue)" />,
        action: () => onRestoreNote(note.id)
      },
      {
        label: 'Delete Permanently',
        icon: <Trash2 size={14} />,
        danger: true,
        action: () => onPermanentDelete(note.id)
      }
    ] : [
      {
        label: isPinned ? 'Unpin Note' : 'Pin Note',
        icon: <Pin size={14} color="var(--accent-yellow)" />,
        shortcut: '⌥P',
        action: () => onTogglePin(note)
      },
      {
        label: isLocked ? 'Unlock Note' : 'Lock Note',
        icon: isLocked ? <Unlock size={14} /> : <Lock size={14} />,
        action: () => onToggleLock(note)
      },
      {
        label: 'New Note',
        icon: <SquarePen size={14} />,
        shortcut: '⌘N',
        action: () => onCreateNote()
      },
      {
        label: 'Duplicate Note',
        icon: <Copy size={14} />,
        shortcut: '⌘D',
        action: () => onDuplicateNote(note)
      },
      {
        label: 'Share Note',
        icon: <Share2 size={14} />,
        action: () => onShareNote(note)
      },
      {
        label: 'Move to...',
        icon: <FolderInput size={14} />,
        submenu: folderSubmenu.length > 0 ? folderSubmenu : [{ label: 'No other folders', disabled: true }]
      },
      { type: 'divider' },
      {
        label: 'Delete',
        icon: <Trash2 size={14} />,
        danger: true,
        shortcut: '⌫',
        action: () => onTrashNote(note.id)
      }
    ]

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: menuItems
    })
  }

  if (isCollapsed) return null

  return (
    <section className={`notes-list-panel ${sidebarCollapsed ? 'with-traffic-lights' : ''}`}>
      <div className="notes-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {sidebarCollapsed && (
            <button 
              className="sidebar-action-btn"
              title="Show Sidebar (Cmd+\)"
              onClick={onToggleSidebar}
            >
              <PanelLeft size={16} />
            </button>
          )}
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            {activeFilter.name || (activeFilter.type === 'all' ? 'All Notes' : activeFilter.type === 'pinned' ? 'Pinned' : 'Trash')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {!isTrashView ? (
            <button 
              className="toolbar-btn toolbar-btn-prominent"
              title="New Note (Cmd+N)"
              onClick={onCreateNote}
            >
              <SquarePen size={14} />
              <span style={{ fontSize: '12px' }}>New</span>
            </button>
          ) : (
            notes.length > 0 && (
              <button
                className="sidebar-action-btn"
                title="Empty Trash"
                onClick={onEmptyTrash}
                style={{ color: 'var(--accent-red)', fontSize: '11px', display: 'flex', gap: '4px' }}
              >
                <Trash2 size={13} />
                <span>Empty</span>
              </button>
            )
          )}

          <button
            className="sidebar-action-btn"
            title="Collapse Notes List (Cmd+Alt+S)"
            onClick={onToggleCollapse}
          >
            <Columns size={15} />
          </button>
        </div>
      </div>

      <div className="notes-list-header">
        <div className="notes-search-box">
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            className="notes-search-input"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="notes-view-controls">
          <span className="notes-list-count-badge">
            {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
          </span>

          <div className="view-toggle-group">
            <button 
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              title="List View"
              onClick={() => setViewMode('list')}
            >
              <List size={14} />
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'gallery' ? 'active' : ''}`}
              title="Large Square Previews (Gallery View)"
              onClick={() => setViewMode('gallery')}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="notes-items-container">
        {notes.length === 0 ? (
          <div className="empty-state" style={{ height: '240px' }}>
            <span className="empty-state-text">No Notes</span>
            {!isTrashView && (
              <button 
                className="btn-primary" 
                onClick={onCreateNote}
                style={{ marginTop: '8px', fontSize: '12px' }}
              >
                Create a Note
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          /* List View (Standard Rows) */
          <div className="notes-row-list">
            {notes.map((note) => {
              const isSelected = selectedNoteId === note.id
              const snippet = note.content_text
                ? note.content_text.replace(/\s+/g, ' ').slice(0, 80)
                : 'No additional text'

              return (
                <div
                  key={note.id}
                  className={`note-card ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectNote(note.id)}
                  onContextMenu={(e) => handleCardContextMenu(e, note)}
                >
                  {note.is_pinned === 1 && (
                    <Pin size={12} className="note-card-pin" fill="var(--accent-yellow)" />
                  )}

                  {note.is_locked === 1 && (
                    <Lock size={12} className="note-card-lock" />
                  )}
                  
                  <h4 className="note-card-title">
                    {note.title || 'New Note'}
                  </h4>

                  <div className="note-card-meta">
                    <span className="note-card-date">
                      {formatNoteDate(note.updated_at)}
                    </span>
                    <span className="note-card-snippet">
                      {snippet}
                    </span>
                  </div>

                  {isTrashView && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className="sidebar-action-btn"
                        title="Restore"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRestoreNote(note.id)
                        }}
                      >
                        <RotateCcw size={13} color="var(--accent-blue)" />
                      </button>
                      <button
                        className="sidebar-action-btn"
                        title="Delete Permanently"
                        onClick={(e) => {
                          e.stopPropagation()
                          onPermanentDelete(note.id)
                        }}
                      >
                        <Trash2 size={13} color="var(--accent-red)" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* Gallery / Large Square Previews View */
          <div className="notes-gallery-grid">
            {notes.map((note) => {
              const isSelected = selectedNoteId === note.id
              const preview = note.content_text
                ? note.content_text.replace(/\s+/g, ' ').slice(0, 140)
                : 'Empty note...'

              return (
                <div
                  key={note.id}
                  className={`gallery-card ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectNote(note.id)}
                  onContextMenu={(e) => handleCardContextMenu(e, note)}
                >
                  {note.is_pinned === 1 && (
                    <Pin size={12} className="note-card-pin" fill="var(--accent-yellow)" />
                  )}

                  {note.is_locked === 1 && (
                    <Lock size={12} className="note-card-lock" />
                  )}

                  <div className="gallery-card-preview-paper">
                    <p className="gallery-card-preview-text">{preview}</p>
                  </div>

                  <div className="gallery-card-footer">
                    <h5 className="gallery-card-title">{note.title || 'New Note'}</h5>
                    <span className="gallery-card-date">{formatNoteDate(note.updated_at)}</span>
                  </div>

                  {isTrashView && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'flex-end' }}>
                      <button
                        className="sidebar-action-btn"
                        title="Restore"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRestoreNote(note.id)
                        }}
                      >
                        <RotateCcw size={12} color="var(--accent-blue)" />
                      </button>
                      <button
                        className="sidebar-action-btn"
                        title="Delete Permanently"
                        onClick={(e) => {
                          e.stopPropagation()
                          onPermanentDelete(note.id)
                        }}
                      >
                        <Trash2 size={12} color="var(--accent-red)" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Right Click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </section>
  )
}
