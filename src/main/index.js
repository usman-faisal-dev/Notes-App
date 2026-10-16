import { app, shell, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

nativeTheme.themeSource = 'dark'

let mainWindow
let dbPath
let store = {
  folders: [],
  notes: [],
  tags: [],
  note_tags: []
}

function loadDatabase() {
  const userDataPath = app.getPath('userData')
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }
  dbPath = join(userDataPath, 'notes-data.json')

  if (fs.existsSync(dbPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'))
      store = {
        folders: data.folders || [],
        notes: data.notes || [],
        tags: data.tags || [],
        note_tags: data.note_tags || []
      }
    } catch (err) {
      console.error('Failed to parse database file, resetting:', err)
    }
  }

  // Seed initial data if empty
  if (store.folders.length === 0) {
    const defaultFolderId = uuidv4()
    store.folders.push({
      id: defaultFolderId,
      name: 'Notes',
      icon: 'folder',
      color: '#ffd60a',
      sort_order: 0,
      created_at: Date.now(),
      updated_at: Date.now()
    })

    store.notes.push({
      id: uuidv4(),
      folder_id: defaultFolderId,
      title: 'Welcome to OpenNotes',
      content: '<h1>Welcome to OpenNotes 📝</h1><p>A fast, open-source cross-platform notes application inspired by Apple Notes.</p><ul><li>Offline-first local storage</li><li>Rich text with TipTap (Markdown, Checklists, Code)</li><li>Runs natively on macOS and Windows</li></ul>',
      content_text: 'Welcome to OpenNotes. A fast, open-source cross-platform notes app inspired by Apple Notes.',
      is_pinned: 1,
      is_locked: 0,
      is_trashed: 0,
      created_at: Date.now(),
      updated_at: Date.now()
    })
    saveDatabase()
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(store, null, 2), 'utf8')
  } catch (err) {
    console.error('Failed to save database:', err)
  }
}

function registerIpcHandlers() {
  // Folders
  ipcMain.handle('folders:getAll', () => {
    return store.folders.map(f => {
      const count = store.notes.filter(n => n.folder_id === f.id && n.is_trashed === 0).length
      return { ...f, note_count: count }
    }).sort((a, b) => a.sort_order - b.sort_order)
  })

  ipcMain.handle('folders:create', (_, data) => {
    const newFolder = {
      id: uuidv4(),
      name: data.name,
      icon: data.icon || 'folder',
      color: data.color || '#ffd60a',
      sort_order: store.folders.length,
      created_at: Date.now(),
      updated_at: Date.now()
    }
    store.folders.push(newFolder)
    saveDatabase()
    return newFolder
  })

  ipcMain.handle('folders:update', (_, { id, name, color, icon }) => {
    const folder = store.folders.find(f => f.id === id)
    if (folder) {
      if (name !== undefined) folder.name = name
      if (color !== undefined) folder.color = color
      if (icon !== undefined) folder.icon = icon
      folder.updated_at = Date.now()
      saveDatabase()
    }
    return folder
  })

  ipcMain.handle('folders:delete', (_, id) => {
    store.folders = store.folders.filter(f => f.id !== id)
    store.notes.forEach(n => {
      if (n.folder_id === id) n.folder_id = null
    })
    saveDatabase()
    return true
  })

  // Notes
  ipcMain.handle('notes:getAll', (_, params = {}) => {
    let result = [...store.notes]

    if (params.trashed) {
      result = result.filter(n => n.is_trashed === 1)
    } else {
      result = result.filter(n => n.is_trashed === 0)

      if (params.folder_id) {
        result = result.filter(n => n.folder_id === params.folder_id)
      }
      if (params.pinned) {
        result = result.filter(n => n.is_pinned === 1)
      }
      if (params.tag_id) {
        const taggedNoteIds = new Set(
          store.note_tags.filter(nt => nt.tag_id === params.tag_id).map(nt => nt.note_id)
        )
        result = result.filter(n => taggedNoteIds.has(n.id))
      }
      if (params.search) {
        const q = params.search.toLowerCase()
        result = result.filter(n => 
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.content_text && n.content_text.toLowerCase().includes(q))
        )
      }
    }

    return result.sort((a, b) => (b.is_pinned - a.is_pinned) || (b.updated_at - a.updated_at))
  })

  ipcMain.handle('notes:get', (_, id) => {
    return store.notes.find(n => n.id === id) || null
  })

  ipcMain.handle('notes:create', (_, data = {}) => {
    const defaultFolder = store.folders[0]?.id || null
    const newNote = {
      id: uuidv4(),
      folder_id: data.folder_id || defaultFolder,
      title: data.title || 'New Note',
      content: data.content || '',
      content_text: data.content_text || '',
      is_pinned: 0,
      is_locked: 0,
      is_trashed: 0,
      created_at: Date.now(),
      updated_at: Date.now()
    }
    store.notes.unshift(newNote)
    saveDatabase()
    return newNote
  })

  ipcMain.handle('notes:update', (_, data) => {
    const note = store.notes.find(n => n.id === data.id)
    if (note) {
      if (data.title !== undefined) note.title = data.title
      if (data.content !== undefined) note.content = data.content
      if (data.content_text !== undefined) note.content_text = data.content_text
      if (data.folder_id !== undefined) note.folder_id = data.folder_id
      if (data.is_pinned !== undefined) note.is_pinned = data.is_pinned
      if (data.is_locked !== undefined) note.is_locked = data.is_locked
      note.updated_at = Date.now()
      saveDatabase()
    }
    return note
  })

  ipcMain.handle('notes:trash', (_, id) => {
    const note = store.notes.find(n => n.id === id)
    if (note) {
      note.is_trashed = 1
      note.updated_at = Date.now()
      saveDatabase()
    }
    return true
  })

  ipcMain.handle('notes:restore', (_, id) => {
    const note = store.notes.find(n => n.id === id)
    if (note) {
      note.is_trashed = 0
      note.updated_at = Date.now()
      saveDatabase()
    }
    return true
  })

  ipcMain.handle('notes:delete', (_, id) => {
    store.notes = store.notes.filter(n => n.id !== id)
    store.note_tags = store.note_tags.filter(nt => nt.note_id !== id)
    saveDatabase()
    return true
  })

  ipcMain.handle('notes:emptyTrash', () => {
    const trashedIds = new Set(store.notes.filter(n => n.is_trashed === 1).map(n => n.id))
    store.notes = store.notes.filter(n => n.is_trashed === 0)
    store.note_tags = store.note_tags.filter(nt => !trashedIds.has(nt.note_id))
    saveDatabase()
    return true
  })

  ipcMain.handle('notes:getStats', () => {
    return {
      total: store.notes.filter(n => n.is_trashed === 0).length,
      pinned: store.notes.filter(n => n.is_pinned === 1 && n.is_trashed === 0).length,
      trash: store.notes.filter(n => n.is_trashed === 1).length
    }
  })

  // Tags
  ipcMain.handle('tags:getAll', () => {
    return [...store.tags]
  })

  ipcMain.handle('tags:create', (_, data) => {
    const existing = store.tags.find(t => t.name.toLowerCase() === data.name.toLowerCase())
    if (existing) return existing

    const newTag = {
      id: uuidv4(),
      name: data.name,
      color: data.color || '#5E5CE6',
      created_at: Date.now()
    }
    store.tags.push(newTag)
    saveDatabase()
    return newTag
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 420,
    minHeight: 400,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    frame: process.platform !== 'darwin',
    backgroundColor: '#1C1C1E',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  loadDatabase()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
