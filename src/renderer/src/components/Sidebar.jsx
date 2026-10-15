import React, { useState } from 'react'
import { 
  Folder, 
  Trash2, 
  Star, 
  Tag as TagIcon, 
  Plus, 
  FolderPlus,
  StickyNote
} from 'lucide-react'

export default function Sidebar({ 
  folders, 
  tags, 
  activeFilter, 
  setActiveFilter, 
  onCreateFolder,
  noteStats
}) {
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const handleCreateFolder = (e) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    onCreateFolder(newFolderName.trim())
    setNewFolderName('')
    setShowFolderModal(false)
  }

  return (
    <aside className="sidebar">
      <div className="window-drag-region"></div>
      
      <div className="sidebar-header">
        <span className="sidebar-title">Quick Filters</span>
      </div>

      <nav className="sidebar-nav">
        <div 
          className={`nav-item ${activeFilter.type === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter({ type: 'all' })}
        >
          <div className="nav-item-left">
            <StickyNote size={16} />
            <span>All Notes</span>
          </div>
          <span className="nav-item-count">{noteStats?.total || 0}</span>
        </div>

        <div 
          className={`nav-item ${activeFilter.type === 'pinned' ? 'active' : ''}`}
          onClick={() => setActiveFilter({ type: 'pinned' })}
        >
          <div className="nav-item-left">
            <Star size={16} color="#ffd60a" />
            <span>Pinned</span>
          </div>
          <span className="nav-item-count">{noteStats?.pinned || 0}</span>
        </div>

        <div 
          className={`nav-item ${activeFilter.type === 'trash' ? 'active' : ''}`}
          onClick={() => setActiveFilter({ type: 'trash' })}
        >
          <div className="nav-item-left">
            <Trash2 size={16} color="#ff453a" />
            <span>Recently Deleted</span>
          </div>
          <span className="nav-item-count">{noteStats?.trash || 0}</span>
        </div>

        <div className="sidebar-section-divider"></div>

        <div className="sidebar-header" style={{ padding: '4px 8px 8px' }}>
          <span className="sidebar-title">Folders</span>
          <button 
            className="sidebar-action-btn"
            title="New Folder"
            onClick={() => setShowFolderModal(true)}
          >
            <Plus size={14} />
          </button>
        </div>

        {folders.map(folder => (
          <div 
            key={folder.id}
            className={`nav-item ${activeFilter.type === 'folder' && activeFilter.id === folder.id ? 'active' : ''}`}
            onClick={() => setActiveFilter({ type: 'folder', id: folder.id, name: folder.name })}
          >
            <div className="nav-item-left">
              <Folder size={16} color={folder.color || '#ffd60a'} />
              <span>{folder.name}</span>
            </div>
            {folder.note_count > 0 && (
              <span className="nav-item-count">{folder.note_count}</span>
            )}
          </div>
        ))}

        {tags && tags.length > 0 && (
          <>
            <div className="sidebar-section-divider"></div>
            <div className="sidebar-header" style={{ padding: '4px 8px 8px' }}>
              <span className="sidebar-title">Tags</span>
            </div>
            {tags.map(tag => (
              <div 
                key={tag.id}
                className={`nav-item ${activeFilter.type === 'tag' && activeFilter.id === tag.id ? 'active' : ''}`}
                onClick={() => setActiveFilter({ type: 'tag', id: tag.id, name: tag.name })}
              >
                <div className="nav-item-left">
                  <TagIcon size={16} color={tag.color || '#bf5af2'} />
                  <span>#{tag.name}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="btn-new-folder" onClick={() => setShowFolderModal(true)}>
          <FolderPlus size={16} />
          <span>New Folder</span>
        </button>
      </div>

      {showFolderModal && (
        <div className="modal-overlay" onClick={() => setShowFolderModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">New Folder</h3>
            <form onSubmit={handleCreateFolder}>
              <input 
                type="text" 
                className="modal-input" 
                placeholder="Folder Name"
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
              />
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowFolderModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  )
}
