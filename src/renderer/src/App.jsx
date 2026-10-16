import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import NotesList from './components/NotesList'
import Editor from './components/Editor'

// In-memory fallback if running in browser dev mode without Electron
const createMockApi = () => {
  let folders = [
    { id: '1', name: 'Notes', color: '#ffd60a', note_count: 2 },
    { id: '2', name: 'Work', color: '#ff9f0a', note_count: 1 },
    { id: '3', name: 'Personal', color: '#30d158', note_count: 0 }
  ]
  let notes = [
    {
      id: 'n1',
      folder_id: '1',
      title: 'Welcome to Open Notes',
      content: '<h1>Welcome to Open Notes</h1><p>A native, open-source cross-platform notes app inspired by Apple Notes.</p><ul><li>Offline-first with SQLite</li><li>Rich text with TipTap</li><li>Runs smoothly on macOS and Windows</li></ul>',
      content_text: 'Welcome to Open Notes. A native, open-source cross-platform notes app inspired by Apple Notes.',
      is_pinned: 1,
      is_trashed: 0,
      updated_at: Date.now()
    },
    {
      id: 'n2',
      folder_id: '1',
      title: 'Reverse Engineering Notes',
      content: '<h2>Reverse Engineering Notes</h2><p>Notes.app on macOS uses a 3-tier prefix architecture: <code>NF*</code> for Data/Persistence, <code>IC*</code> for iCloud Mac UI, and <code>SY*</code> for Synapse AI integration.</p>',
      content_text: 'Reverse Engineering Notes. Notes.app on macOS uses a 3-tier prefix architecture...',
      is_pinned: 0,
      is_trashed: 0,
      updated_at: Date.now() - 3600000
    }
  ]
  let tags = [{ id: 't1', name: 'ideas', color: '#bf5af2' }]

  return {
    getFolders: async () => [...folders],
    createFolder: async (data) => {
      const f = { id: String(Date.now()), name: data.name, color: '#ffd60a', note_count: 0 }
      folders.push(f)
      return f
    },
    getNotes: async (params = {}) => {
      let filtered = [...notes]
      if (params.trashed) {
        filtered = filtered.filter(n => n.is_trashed === 1)
      } else {
        filtered = filtered.filter(n => n.is_trashed === 0)
        if (params.folder_id) filtered = filtered.filter(n => n.folder_id === params.folder_id)
        if (params.pinned) filtered = filtered.filter(n => n.is_pinned === 1)
        if (params.search) {
          const q = params.search.toLowerCase()
          filtered = filtered.filter(n => 
            (n.title && n.title.toLowerCase().includes(q)) || 
            (n.content_text && n.content_text.toLowerCase().includes(q))
          )
        }
      }
      return filtered.sort((a, b) => (b.is_pinned - a.is_pinned) || (b.updated_at - a.updated_at))
    },
    createNote: async (data) => {
      const n = {
        id: String(Date.now()),
        folder_id: data?.folder_id || '1',
        title: 'New Note',
        content: '',
        content_text: '',
        is_pinned: 0,
        is_trashed: 0,
        updated_at: Date.now()
      }
      notes.unshift(n)
      return n
    },
    updateNote: async (data) => {
      const idx = notes.findIndex(n => n.id === data.id)
      if (idx !== -1) {
        notes[idx] = { ...notes[idx], ...data, updated_at: Date.now() }
        return notes[idx]
      }
      return null
    },
    trashNote: async (id) => {
      const idx = notes.findIndex(n => n.id === id)
      if (idx !== -1) notes[idx].is_trashed = 1
      return true
    },
    restoreNote: async (id) => {
      const idx = notes.findIndex(n => n.id === id)
      if (idx !== -1) notes[idx].is_trashed = 0
      return true
    },
    deleteNote: async (id) => {
      notes = notes.filter(n => n.id !== id)
      return true
    },
    emptyTrash: async () => {
      notes = notes.filter(n => n.is_trashed === 0)
      return true
    },
    getNoteStats: async () => ({
      total: notes.filter(n => n.is_trashed === 0).length,
      pinned: notes.filter(n => n.is_pinned === 1 && n.is_trashed === 0).length,
      trash: notes.filter(n => n.is_trashed === 1).length
    }),
    getTags: async () => [...tags]
  }
}

const api = window.api || createMockApi()

export default function App() {
  const [folders, setFolders] = useState([])
  const [tags, setTags] = useState([])
  const [noteStats, setNoteStats] = useState({ total: 0, pinned: 0, trash: 0 })
  const [notes, setNotes] = useState([])
  const [selectedNoteId, setSelectedNoteId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState({ type: 'all' })

  // Layout & View states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notesListCollapsed, setNotesListCollapsed] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'gallery'

  // Load Folders & Stats
  const loadSidebarData = useCallback(async () => {
    try {
      const [fList, tList, stats] = await Promise.all([
        api.getFolders(),
        api.getTags ? api.getTags() : [],
        api.getNoteStats()
      ])
      setFolders(fList || [])
      setTags(tList || [])
      setNoteStats(stats || { total: 0, pinned: 0, trash: 0 })
    } catch (err) {
      console.error('Error loading sidebar data:', err)
    }
  }, [])

  // Load Notes list based on current filter and search
  const loadNotes = useCallback(async () => {
    try {
      const params = {}
      if (activeFilter.type === 'trash') {
        params.trashed = true
      } else if (activeFilter.type === 'pinned') {
        params.pinned = true
      } else if (activeFilter.type === 'folder') {
        params.folder_id = activeFilter.id
      } else if (activeFilter.type === 'tag') {
        params.tag_id = activeFilter.id
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }

      const noteList = await api.getNotes(params)
      setNotes(noteList || [])

      // Auto-select first note if nothing selected or current note no longer in list
      if (noteList && noteList.length > 0) {
        if (!selectedNoteId || !noteList.some(n => n.id === selectedNoteId)) {
          setSelectedNoteId(noteList[0].id)
        }
      } else {
        setSelectedNoteId(null)
      }
    } catch (err) {
      console.error('Error loading notes:', err)
    }
  }, [activeFilter, searchQuery, selectedNoteId])

  useEffect(() => {
    loadSidebarData()
  }, [loadSidebarData])

  useEffect(() => {
    loadNotes()
  }, [activeFilter, searchQuery])

  // Handlers
  const handleCreateFolder = async (name) => {
    try {
      await api.createFolder({ name })
      await loadSidebarData()
    } catch (err) {
      console.error('Error creating folder:', err)
    }
  }

  const handleCreateNote = async () => {
    try {
      const folder_id = activeFilter.type === 'folder' ? activeFilter.id : (folders[0]?.id || null)
      const newNote = await api.createNote({ folder_id })
      await loadSidebarData()
      await loadNotes()
      if (newNote?.id) {
        setSelectedNoteId(newNote.id)
      }
    } catch (err) {
      console.error('Error creating note:', err)
    }
  }

  const handleUpdateNote = async (data) => {
    try {
      await api.updateNote(data)
      setNotes(prev => prev.map(n => n.id === data.id ? { ...n, ...data, updated_at: Date.now() } : n))
      loadSidebarData()
    } catch (err) {
      console.error('Error updating note:', err)
    }
  }

  const handleTrashNote = async (id) => {
    try {
      await api.trashNote(id)
      await loadSidebarData()
      await loadNotes()
    } catch (err) {
      console.error('Error trashing note:', err)
    }
  }

  const handleRestoreNote = async (id) => {
    try {
      await api.restoreNote(id)
      await loadSidebarData()
      await loadNotes()
    } catch (err) {
      console.error('Error restoring note:', err)
    }
  }

  const handlePermanentDelete = async (id) => {
    try {
      await api.deleteNote(id)
      await loadSidebarData()
      await loadNotes()
    } catch (err) {
      console.error('Error permanently deleting note:', err)
    }
  }

  const handleEmptyTrash = async () => {
    try {
      await api.emptyTrash()
      await loadSidebarData()
      await loadNotes()
    } catch (err) {
      console.error('Error emptying trash:', err)
    }
  }

  // Toggle Maximize / Focus Mode
  const handleToggleMaximize = () => {
    if (!isMaximized) {
      setIsMaximized(true)
      setSidebarCollapsed(true)
      setNotesListCollapsed(true)
    } else {
      setIsMaximized(false)
      setSidebarCollapsed(false)
      setNotesListCollapsed(false)
    }
  }

  // Global Keyboard Shortcuts (Cmd+N for New Note, Cmd+Shift+F for Maximize)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey

      if (isCmdOrCtrl && e.key === 'n' && !e.shiftKey) {
        e.preventDefault()
        handleCreateNote()
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        handleToggleMaximize()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [folders, activeFilter, isMaximized])

  const activeNote = notes.find(n => n.id === selectedNoteId) || null

  return (
    <div className="app-container">
      <Sidebar
        folders={folders}
        tags={tags}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        onCreateFolder={handleCreateFolder}
        noteStats={noteStats}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <NotesList
        notes={notes}
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
        onCreateNote={handleCreateNote}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeFilter={activeFilter}
        onEmptyTrash={handleEmptyTrash}
        onRestoreNote={handleRestoreNote}
        onPermanentDelete={handlePermanentDelete}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isCollapsed={notesListCollapsed}
        onToggleCollapse={() => setNotesListCollapsed(!notesListCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <Editor
        note={activeNote}
        onUpdateNote={handleUpdateNote}
        onTrashNote={handleTrashNote}
        onCreateNote={handleCreateNote}
        isReadOnly={activeFilter.type === 'trash'}
        isMaximized={isMaximized}
        onToggleMaximize={handleToggleMaximize}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        notesListCollapsed={notesListCollapsed}
        onToggleNotesList={() => setNotesListCollapsed(!notesListCollapsed)}
      />
    </div>
  )
}
