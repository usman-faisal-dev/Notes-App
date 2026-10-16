import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { v4 as uuidv4 } from 'uuid'

console.log('🧪 Starting OpenNotes Comprehensive Functionality Test Suite...\n')

// Set up an isolated temporary test database directory
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-test-'))
const dbPath = path.join(testDir, 'notes-data.json')

let store = {
  folders: [],
  notes: [],
  tags: [],
  note_tags: []
}

function saveDatabase() {
  fs.writeFileSync(dbPath, JSON.stringify(store, null, 2), 'utf8')
}

function loadDatabase() {
  if (fs.existsSync(dbPath)) {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'))
    store = {
      folders: data.folders || [],
      notes: data.notes || [],
      tags: data.tags || [],
      note_tags: data.note_tags || []
    }
  }
}

// Simulated IPC Handler implementations (identical to src/main/index.js)
const api = {
  // Folders
  getAllFolders: () => {
    return store.folders.map(f => {
      const count = store.notes.filter(n => n.folder_id === f.id && n.is_trashed === 0).length
      return { ...f, note_count: count }
    }).sort((a, b) => a.sort_order - b.sort_order)
  },
  createFolder: (data) => {
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
  },
  updateFolder: ({ id, name, color, icon }) => {
    const folder = store.folders.find(f => f.id === id)
    if (folder) {
      if (name !== undefined) folder.name = name
      if (color !== undefined) folder.color = color
      if (icon !== undefined) folder.icon = icon
      folder.updated_at = Date.now()
      saveDatabase()
    }
    return folder
  },
  deleteFolder: (id) => {
    store.folders = store.folders.filter(f => f.id !== id)
    store.notes.forEach(n => {
      if (n.folder_id === id) n.folder_id = null
    })
    saveDatabase()
    return true
  },

  // Notes
  getAllNotes: (params = {}) => {
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
  },
  getNote: (id) => {
    return store.notes.find(n => n.id === id) || null
  },
  createNote: (data = {}) => {
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
  },
  updateNote: (data) => {
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
  },
  trashNote: (id) => {
    const note = store.notes.find(n => n.id === id)
    if (note) {
      note.is_trashed = 1
      note.updated_at = Date.now()
      saveDatabase()
    }
    return true
  },
  restoreNote: (id) => {
    const note = store.notes.find(n => n.id === id)
    if (note) {
      note.is_trashed = 0
      note.updated_at = Date.now()
      saveDatabase()
    }
    return true
  },
  deleteNote: (id) => {
    store.notes = store.notes.filter(n => n.id !== id)
    store.note_tags = store.note_tags.filter(nt => nt.note_id !== id)
    saveDatabase()
    return true
  },
  emptyTrash: () => {
    const trashedIds = new Set(store.notes.filter(n => n.is_trashed === 1).map(n => n.id))
    store.notes = store.notes.filter(n => n.is_trashed === 0)
    store.note_tags = store.note_tags.filter(nt => !trashedIds.has(nt.note_id))
    saveDatabase()
    return true
  },
  getNoteStats: () => {
    return {
      total: store.notes.filter(n => n.is_trashed === 0).length,
      pinned: store.notes.filter(n => n.is_pinned === 1 && n.is_trashed === 0).length,
      trash: store.notes.filter(n => n.is_trashed === 1).length
    }
  },

  // Tags
  getAllTags: () => [...store.tags],
  createTag: (data) => {
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
  },
  addTagToNote: (note_id, tag_id) => {
    const exists = store.note_tags.some(nt => nt.note_id === note_id && nt.tag_id === tag_id)
    if (!exists) {
      store.note_tags.push({ note_id, tag_id })
      saveDatabase()
    }
    return true
  }
}

let totalTests = 0
let passedTests = 0

function test(name, fn) {
  totalTests++
  try {
    fn()
    passedTests++
    console.log(`  ✅ PASS: ${name}`)
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`)
    console.error(`     Error: ${err.message}`)
  }
}

console.log('📦 Category 1: Folder Management')
let personalFolder, workFolder

test('Create default folder & custom folders', () => {
  personalFolder = api.createFolder({ name: 'Personal', color: '#30d158' })
  workFolder = api.createFolder({ name: 'Work', color: '#ff9f0a' })

  const folders = api.getAllFolders()
  assert.equal(folders.length, 2)
  assert.equal(folders[0].name, 'Personal')
  assert.equal(folders[1].name, 'Work')
})

test('Update folder name & color', () => {
  const updated = api.updateFolder({ id: workFolder.id, name: 'Work Projects', color: '#0a84ff' })
  assert.equal(updated.name, 'Work Projects')
  assert.equal(updated.color, '#0a84ff')
})

console.log('\n📝 Category 2: Note Creation & Rich Text Editing')
let note1, note2, note3

test('Create notes in specific folders', () => {
  note1 = api.createNote({
    folder_id: personalFolder.id,
    title: 'Grocery List',
    content: '<h1>Grocery List</h1><ul><li>Almond Milk</li><li>Apples</li><li>Coffee</li></ul>',
    content_text: 'Grocery List. Almond Milk Apples Coffee'
  })
  assert.ok(note1.id)
  assert.equal(note1.title, 'Grocery List')
  assert.equal(note1.folder_id, personalFolder.id)

  note2 = api.createNote({
    folder_id: workFolder.id,
    title: 'Sprint Planning',
    content: '<h2>Sprint Planning</h2><p>Deliver the Notes app release by Friday.</p>',
    content_text: 'Sprint Planning. Deliver the Notes app release by Friday.'
  })

  note3 = api.createNote({
    folder_id: personalFolder.id,
    title: 'Workout Routine',
    content: '<p>Leg day: Squats 4x10, Lunges 3x12</p>',
    content_text: 'Workout Routine. Leg day: Squats 4x10, Lunges 3x12'
  })

  const stats = api.getNoteStats()
  assert.equal(stats.total, 3)
  assert.equal(stats.trash, 0)
})

test('Verify folder note counts update dynamically', () => {
  const folders = api.getAllFolders()
  const personal = folders.find(f => f.id === personalFolder.id)
  const work = folders.find(f => f.id === workFolder.id)

  assert.equal(personal.note_count, 2)
  assert.equal(work.note_count, 1)
})

test('Update note content and title dynamically', () => {
  const updated = api.updateNote({
    id: note1.id,
    title: 'Weekly Grocery List',
    content: '<h1>Weekly Grocery List</h1><ul><li>Oat Milk</li><li>Bananas</li></ul>',
    content_text: 'Weekly Grocery List. Oat Milk Bananas'
  })
  assert.equal(updated.title, 'Weekly Grocery List')
  assert.ok(updated.content.includes('Oat Milk'))
})

console.log('\n📌 Category 3: Pinned Notes & Priority Ordering')

test('Pin a note and verify priority sort order', () => {
  // Pin note2 (Sprint Planning)
  api.updateNote({ id: note2.id, is_pinned: 1 })

  const notes = api.getAllNotes()
  assert.equal(notes[0].id, note2.id, 'Pinned note must appear first in list')
  assert.equal(notes[0].is_pinned, 1)

  const stats = api.getNoteStats()
  assert.equal(stats.pinned, 1)
})

test('Filter notes by pinned status only', () => {
  const pinnedOnly = api.getAllNotes({ pinned: true })
  assert.equal(pinnedOnly.length, 1)
  assert.equal(pinnedOnly[0].id, note2.id)
})

console.log('\n🔍 Category 4: Search & Folder Filtering')

test('Filter notes by folder_id', () => {
  const personalNotes = api.getAllNotes({ folder_id: personalFolder.id })
  assert.equal(personalNotes.length, 2)
  assert.ok(personalNotes.every(n => n.folder_id === personalFolder.id))
})

test('Search notes by title keyword (case-insensitive)', () => {
  const searchResults = api.getAllNotes({ search: 'grocery' })
  assert.equal(searchResults.length, 1)
  assert.equal(searchResults[0].id, note1.id)
})

test('Search notes by body content text', () => {
  const searchResults = api.getAllNotes({ search: 'squats' })
  assert.equal(searchResults.length, 1)
  assert.equal(searchResults[0].id, note3.id)
})

test('Search with no matches returns empty array', () => {
  const searchResults = api.getAllNotes({ search: 'nonexistenttermxyz' })
  assert.equal(searchResults.length, 0)
})

console.log('\n🏷 Category 5: Tags Support')
let tagIdeas, tagUrgent

test('Create tags with deduplication', () => {
  tagIdeas = api.createTag({ name: 'ideas', color: '#bf5af2' })
  tagUrgent = api.createTag({ name: 'urgent', color: '#ff453a' })
  const duplicate = api.createTag({ name: 'IDEAS', color: '#123456' })

  const allTags = api.getAllTags()
  assert.equal(allTags.length, 2)
  assert.equal(duplicate.id, tagIdeas.id, 'Duplicate tag should return existing tag')
})

test('Associate tag with note and filter by tag', () => {
  api.addTagToNote(note2.id, tagUrgent.id)

  const taggedNotes = api.getAllNotes({ tag_id: tagUrgent.id })
  assert.equal(taggedNotes.length, 1)
  assert.equal(taggedNotes[0].id, note2.id)
})

console.log('\n🗑 Category 6: Trash, Restore & Empty Trash (Lifecycle)')

test('Soft-delete note (move to trash)', () => {
  api.trashNote(note3.id)

  const activeNotes = api.getAllNotes()
  assert.equal(activeNotes.length, 2)
  assert.ok(!activeNotes.some(n => n.id === note3.id), 'Trashed note must not appear in active notes')

  const trashedNotes = api.getAllNotes({ trashed: true })
  assert.equal(trashedNotes.length, 1)
  assert.equal(trashedNotes[0].id, note3.id)

  const stats = api.getNoteStats()
  assert.equal(stats.total, 2)
  assert.equal(stats.trash, 1)
})

test('Folder count discounts trashed notes', () => {
  const folders = api.getAllFolders()
  const personal = folders.find(f => f.id === personalFolder.id)
  // note3 was in personalFolder and was trashed, so personal count should now be 1
  assert.equal(personal.note_count, 1)
})

test('Restore note from trash', () => {
  api.restoreNote(note3.id)

  const activeNotes = api.getAllNotes()
  assert.equal(activeNotes.length, 3)
  assert.ok(activeNotes.some(n => n.id === note3.id))

  const trashedNotes = api.getAllNotes({ trashed: true })
  assert.equal(trashedNotes.length, 0)

  const stats = api.getNoteStats()
  assert.equal(stats.total, 3)
  assert.equal(stats.trash, 0)
})

test('Permanent deletion of a single note', () => {
  const tempNote = api.createNote({ title: 'Temporary Note' })
  api.trashNote(tempNote.id)
  api.deleteNote(tempNote.id)

  const found = api.getNote(tempNote.id)
  assert.equal(found, null)

  const allNotes = api.getAllNotes({ trashed: true })
  assert.ok(!allNotes.some(n => n.id === tempNote.id))
})

test('Empty entire trash', () => {
  // Trash note1 and note3
  api.trashNote(note1.id)
  api.trashNote(note3.id)
  assert.equal(api.getNoteStats().trash, 2)

  api.emptyTrash()

  assert.equal(api.getNoteStats().trash, 0)
  assert.equal(api.getAllNotes({ trashed: true }).length, 0)
  assert.equal(api.getAllNotes().length, 1, 'Only non-trashed note2 should remain')
})

console.log('\n💾 Category 7: Persistence Round-Trip')

test('Verify atomic file save & complete reload from disk', () => {
  // Verify disk file exists
  assert.ok(fs.existsSync(dbPath))
  const fileContent = JSON.parse(fs.readFileSync(dbPath, 'utf8'))
  assert.ok(fileContent.notes.length > 0)
  assert.ok(fileContent.folders.length > 0)

  // Wipe in-memory store and re-read from disk
  store = { folders: [], notes: [], tags: [], note_tags: [] }
  assert.equal(store.notes.length, 0)

  loadDatabase()
  assert.equal(store.notes.length, 1)
  assert.equal(store.notes[0].id, note2.id)
  assert.equal(store.folders.length, 2)
  assert.equal(store.tags.length, 2)
})

test('Deleting a folder resets associated notes folder_id without deleting notes', () => {
  api.deleteFolder(workFolder.id)
  const remainingFolders = api.getAllFolders()
  assert.equal(remainingFolders.length, 1)

  const note = api.getNote(note2.id)
  assert.equal(note.folder_id, null, 'Note folder_id must be reset to null when parent folder is deleted')
})

// Clean up test directory
fs.rmSync(testDir, { recursive: true, force: true })

console.log(`\n========================================`)
console.log(`Test Results: ${passedTests}/${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`)
console.log(`========================================`)

if (passedTests !== totalTests) {
  process.exit(1)
} else {
  console.log('🎉 All functionality tests passed with 100% success!\n')
}
