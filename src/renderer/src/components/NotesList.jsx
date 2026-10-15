import React from 'react'
import { Search, Pin, Plus, Trash2, RotateCcw } from 'lucide-react'
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
  onPermanentDelete
}) {
  const isTrashView = activeFilter.type === 'trash'

  return (
    <section className="notes-list-panel">
      <div className="window-drag-region" style={{ paddingLeft: '16px', justifyContent: 'flex-end', paddingRight: '16px' }}>
        {!isTrashView ? (
          <button 
            className="sidebar-action-btn"
            title="Create Note"
            onClick={onCreateNote}
            style={{ color: 'var(--accent-yellow)', transform: 'scale(1.1)' }}
          >
            <Plus size={18} />
          </button>
        ) : (
          notes.length > 0 && (
            <button
              className="sidebar-action-btn"
              title="Empty Trash"
              onClick={onEmptyTrash}
              style={{ color: 'var(--accent-red)', fontSize: '11px', display: 'flex', gap: '4px' }}
            >
              <Trash2 size={14} />
              <span>Empty</span>
            </button>
          )
        )}
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
        <div className="notes-list-count-badge">
          {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
        </div>
      </div>

      <div className="notes-items-container">
        {notes.length === 0 ? (
          <div className="empty-state" style={{ height: '200px' }}>
            <span className="empty-state-text">No Notes</span>
          </div>
        ) : (
          notes.map((note) => {
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
          })
        )}
      </div>
    </section>
  )
}
