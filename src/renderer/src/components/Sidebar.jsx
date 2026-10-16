import React, { useState } from 'react'
import { 
  Folder, 
  Trash2, 
  Star, 
  Tag as TagIcon, 
  Plus, 
  FolderPlus, 
  StickyNote, 
  ChevronDown, 
  ChevronRight, 
  PanelLeftClose,
  AlertTriangle
} from 'lucide-react'

export default function Sidebar({ 
  folders, 
  tags, 
  activeFilter, 
  setActiveFilter, 
  onCreateFolder, 
  onDeleteFolder,
  noteStats, 
  isCollapsed, 
  onToggleCollapse 
}) {
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [foldersExpanded, setFoldersExpanded] = useState(true)
  const [tagsExpanded, setTagsExpanded] = useState(true)

  const handleCreateFolder = (e) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    onCreateFolder(newFolderName.trim())
    setNewFolderName('')
    setShowFolderModal(false)
  }

  const handleConfirmDeleteFolder = () => {
    if (folderToDelete) {
      onDeleteFolder(folderToDelete.id)
      setFolderToDelete(null)
    }
  }

  if (isCollapsed) return null

  return (
    <aside className="sidebar">
      {/* Top Bar with traffic light spacing on left and collapse button on right */}
      <div className="sidebar-topbar">
        <button 
          className="sidebar-action-btn"
          title="Collapse Sidebar (Cmd+\)"
          onClick={onToggleCollapse}
        >
          <PanelLeftClose size={16} />
        </button>
      </div>
      
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

        {/* Folders Section with Expand/Collapse */}
        <div className="sidebar-header" style={{ padding: '4px 8px 8px' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            onClick={() => setFoldersExpanded(!foldersExpanded)}
          >
            {foldersExpanded ? <ChevronDown size={14} color="var(--text-secondary)" /> : <ChevronRight size={14} color="var(--text-secondary)" />}
            <span className="sidebar-title">Folders</span>
          </div>
          <button 
            className="sidebar-action-btn"
            title="New Folder"
            onClick={(e) => {
              e.stopPropagation()
              setShowFolderModal(true)
            }}
          >
            <Plus size={14} />
          </button>
        </div>

        {foldersExpanded && folders.map(folder => (
          <div 
            key={folder.id}
            className={`nav-item ${activeFilter.type === 'folder' && activeFilter.id === folder.id ? 'active' : ''}`}
            onClick={() => setActiveFilter({ type: 'folder', id: folder.id, name: folder.name })}
          >
            <div className="nav-item-left">
              <Folder size={16} color={folder.color || '#ffd60a'} />
              <span>{folder.name}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {folder.note_count > 0 && (
                <span className="nav-item-count">{folder.note_count}</span>
              )}
              {/* Delete Folder Button */}
              <button
                className="folder-delete-btn"
                title={`Delete Folder "${folder.name}"`}
                onClick={(e) => {
                  e.stopPropagation()
                  setFolderToDelete(folder)
                }}
              >
                <Trash2 size={13} color="var(--accent-red)" />
              </button>
            </div>
          </div>
        ))}

        {/* Tags Section with Expand/Collapse */}
        {tags && tags.length > 0 && (
          <>
            <div className="sidebar-section-divider"></div>
            <div className="sidebar-header" style={{ padding: '4px 8px 8px' }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                onClick={() => setTagsExpanded(!tagsExpanded)}
              >
                {tagsExpanded ? <ChevronDown size={14} color="var(--text-secondary)" /> : <ChevronRight size={14} color="var(--text-secondary)" />}
                <span className="sidebar-title">Tags</span>
              </div>
            </div>
            {tagsExpanded && tags.map(tag => (
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

      {/* New Folder Modal */}
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

      {/* Delete Folder Confirmation Modal */}
      {folderToDelete && (
        <div className="modal-overlay" onClick={() => setFolderToDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <AlertTriangle size={20} color="var(--accent-red)" />
              <h3 className="modal-title" style={{ margin: 0 }}>Delete Folder</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to delete <strong>"{folderToDelete.name}"</strong>? Notes in this folder will not be deleted and will remain in <em>All Notes</em>.
            </p>
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setFolderToDelete(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ background: 'var(--accent-red)', color: '#fff' }}
                onClick={handleConfirmDeleteFolder}
              >
                Delete Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
