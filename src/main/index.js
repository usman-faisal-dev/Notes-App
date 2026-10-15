import { app, shell, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'

nativeTheme.themeSource = 'dark'

let db
let mainWindow

function createDatabase() {
  const userDataPath = app.getPath('userData')
  db = new Database(join(userDataPath, 'notes.db'))

  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'folder',
      color TEXT DEFAULT '#FFD60A',
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      folder_id TEXT,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT DEFAULT '',
      content_text TEXT DEFAULT '',
      is_pinned INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      is_trashed INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#5E5CE6',
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_trashed ON notes(is_trashed);
  `)

  // Seed default folders if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM folders').get()
  if (count.c === 0) {
    const now = Date.now()
    db.prepare('INSERT INTO folders (id, name, icon, color, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), 'Personal', 'folder', '#FFD60A', 0, now, now)
    db.prepare('INSERT INTO folders (id, name, icon, color, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), 'Work', 'briefcase', '#30D158', 1, now, now)
    db.prepare('INSERT INTO folders (id, name, icon, color, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), 'Ideas', 'lightbulb', '#FF9F0A', 2, now, now)
  }
}

// --- IPC Handlers ---

// FOLDERS
ipcMain.handle('folders:getAll', () => {
  return db.prepare('SELECT * FROM folders ORDER BY sort_order ASC, name ASC').all()
})

ipcMain.handle('folders:create', (_, { name, icon = 'folder', color = '#FFD60A' }) => {
  const id = uuidv4()
  const now = Date.now()
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM folders').get()
  const sortOrder = (maxOrder.m ?? -1) + 1
  db.prepare('INSERT INTO folders (id, name, icon, color, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, name, icon, color, sortOrder, now, now)
  return db.prepare('SELECT * FROM folders WHERE id = ?').get(id)
})

ipcMain.handle('folders:update', (_, { id, name, icon, color }) => {
  const now = Date.now()
  db.prepare('UPDATE folders SET name = ?, icon = ?, color = ?, updated_at = ? WHERE id = ?')
    .run(name, icon, color, now, id)
  return db.prepare('SELECT * FROM folders WHERE id = ?').get(id)
})

ipcMain.handle('folders:delete', (_, id) => {
  db.prepare('DELETE FROM folders WHERE id = ?').run(id)
  return true
})

// NOTES
ipcMain.handle('notes:getAll', (_, { folderId, view, search }) => {
  if (search && search.trim()) {
    const q = `%${search.trim()}%`
    return db.prepare(`
      SELECT * FROM notes
      WHERE is_trashed = 0 AND (title LIKE ? OR content_text LIKE ?)
      ORDER BY is_pinned DESC, updated_at DESC
    `).all(q, q)
  }
  if (view === 'all') {
    return db.prepare('SELECT * FROM notes WHERE is_trashed = 0 ORDER BY is_pinned DESC, updated_at DESC').all()
  }
  if (view === 'trash') {
    return db.prepare('SELECT * FROM notes WHERE is_trashed = 1 ORDER BY updated_at DESC').all()
  }
  if (folderId) {
    return db.prepare('SELECT * FROM notes WHERE folder_id = ? AND is_trashed = 0 ORDER BY is_pinned DESC, updated_at DESC').all(folderId)
  }
  return db.prepare('SELECT * FROM notes WHERE is_trashed = 0 ORDER BY is_pinned DESC, updated_at DESC').all()
})

ipcMain.handle('notes:get', (_, id) => {
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
})

ipcMain.handle('notes:create', (_, { folderId, title = 'New Note', content = '', content_text = '' }) => {
  const id = uuidv4()
  const now = Date.now()
  db.prepare('INSERT INTO notes (id, folder_id, title, content, content_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, folderId || null, title, content, content_text, now, now)
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
})

ipcMain.handle('notes:update', (_, { id, title, content, content_text, is_pinned, is_locked }) => {
  const now = Date.now()
  const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
  if (!existing) return null
  db.prepare(`UPDATE notes SET
    title = ?, content = ?, content_text = ?,
    is_pinned = ?, is_locked = ?, updated_at = ?
    WHERE id = ?`).run(
    title ?? existing.title,
    content ?? existing.content,
    content_text ?? existing.content_text,
    is_pinned ?? existing.is_pinned,
    is_locked ?? existing.is_locked,
    now, id
  )
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
})

ipcMain.handle('notes:trash', (_, id) => {
  db.prepare('UPDATE notes SET is_trashed = 1, updated_at = ? WHERE id = ?').run(Date.now(), id)
  return true
})

ipcMain.handle('notes:restore', (_, id) => {
  db.prepare('UPDATE notes SET is_trashed = 0, updated_at = ? WHERE id = ?').run(Date.now(), id)
  return true
})

ipcMain.handle('notes:delete', (_, id) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(id)
  return true
})

ipcMain.handle('notes:emptyTrash', () => {
  db.prepare('DELETE FROM notes WHERE is_trashed = 1').run()
  return true
})

ipcMain.handle('notes:getStats', () => {
  const total = db.prepare('SELECT COUNT(*) as c FROM notes WHERE is_trashed = 0').get().c
  const trashed = db.prepare('SELECT COUNT(*) as c FROM notes WHERE is_trashed = 1').get().c
  return { total, trashed }
})

// TAGS
ipcMain.handle('tags:getAll', () => {
  return db.prepare('SELECT * FROM tags ORDER BY name ASC').all()
})

ipcMain.handle('tags:create', (_, { name, color }) => {
  const id = uuidv4()
  const now = Date.now()
  db.prepare('INSERT OR IGNORE INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)').run(id, name, color || '#5E5CE6', now)
  return db.prepare('SELECT * FROM tags WHERE name = ?').get(name)
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
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
  createDatabase()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
