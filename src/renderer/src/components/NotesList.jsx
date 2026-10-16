import React from 'react'
import { 
  Search, 
  Pin, 
  Plus, 
  Trash2, 
  RotateCcw, 
  List, 
  LayoutGrid,
  SquarePen,
  PanelLeft
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'

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
  const isTrashView = activeFilter.type === 'trash'

  return (
    <section className={`notes-list-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="notes-top-toolbar window-drag-region">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {sidebarCollapsed && (
            <button 
              className="sidebar-action-btn"
              title="Show Sidebar"
              onClick={onToggleSidebar}
            >
              <PanelLeft size={16} />
            </button>
          )}
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            {activeFilter.name || (activeFilter.type === 'all' ? 'All Notes' : activeFilter.type === 'pinned' ? 'Pinned' : 'Trash')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!isTrashView ? (
            <button 
              className="toolbar-btn toolbar-btn-prominent"
              title="New Note (Cmd+N)"
              onClick={onCreateNote}
            >
              <SquarePen size={15} />
              <span style={{ fontSize: '12px' }}>New Note</span>
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
                >
                  {note.is_pinned === 1 && (
                    <Pin size={12} className="note-card-pin" fill="var(--accent-yellow)" />
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
                >
                  {note.is_pinned === 1 && (
                    <Pin size={12} className="note-card-pin" fill="var(--accent-yellow)" />
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
    </section>
  )
}
