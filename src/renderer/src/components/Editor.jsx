import React, { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Code, 
  Highlighter, 
  Quote, 
  Pin, 
  Trash2, 
  FileText,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Copy,
  ClipboardPaste,
  Download,
  Upload,
  FileCode,
  SquarePen,
  PanelLeft,
  Columns
} from 'lucide-react'
import { format } from 'date-fns'
import { htmlToMarkdown, markdownToHtml, copyToClipboard, exportAsFile } from '../utils/markdown'

export default function Editor({ 
  note, 
  onUpdateNote, 
  onTrashNote, 
  onCreateNote,
  isReadOnly,
  isMaximized,
  onToggleMaximize,
  sidebarCollapsed,
  onToggleSidebar,
  notesListCollapsed,
  onToggleNotesList
}) {
  const saveTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  const [showMenu, setShowMenu] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Placeholder.configure({
        placeholder: 'Type something or start with a title...'
      })
    ],
    content: note ? note.content : '',
    editable: !isReadOnly,
    editorProps: {
      handlePaste: (view, event, slice) => {
        const text = event.clipboardData?.getData('text/plain')
        if (text && (text.includes('# ') || text.includes('- [ ]') || text.includes('- [x]') || text.includes('```') || text.includes('**'))) {
          const parsedHtml = markdownToHtml(text)
          editor?.commands.insertContent(parsedHtml)
          return true
        }
        return false
      }
    },
    onUpdate: ({ editor }) => {
      if (!note || isReadOnly) return

      const html = editor.getHTML()
      const text = editor.getText()

      // Automatically deduce title from the first non-empty line
      const firstLine = text.trim().split('\n')[0] || 'Untitled Note'
      const title = firstLine.slice(0, 60)

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        onUpdateNote({
          id: note.id,
          title,
          content: html,
          content_text: text
        })
      }, 350)
    }
  }, [note?.id])

  // Sync content when note selection changes
  useEffect(() => {
    if (editor && note) {
      if (editor.getHTML() !== note.content) {
        editor.commands.setContent(note.content || '', false)
      }
      editor.setEditable(!isReadOnly)
    }
  }, [note?.id, isReadOnly])

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => setShowMenu(false)
    if (showMenu) {
      window.addEventListener('click', handleOutsideClick)
      return () => window.removeEventListener('click', handleOutsideClick)
    }
  }, [showMenu])

  // Markdown Action Handlers
  const handleCopyMarkdown = async () => {
    if (!editor) return
    const md = htmlToMarkdown(editor.getHTML())
    await copyToClipboard(md)
    showToast('Copied as Markdown!')
    setShowMenu(false)
  }

  const handleCopyPlainText = async () => {
    if (!editor) return
    const text = editor.getText()
    await copyToClipboard(text)
    showToast('Copied as Plain Text!')
    setShowMenu(false)
  }

  // Explicit Paste as Markdown handler
  const handlePasteMarkdown = async () => {
    if (!editor || isReadOnly) return
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        const html = markdownToHtml(text)
        editor.commands.insertContent(html)
        showToast('Pasted as Markdown!')
      }
    } catch (err) {
      console.error('Failed to paste markdown:', err)
      showToast('Clipboard access denied')
    }
    setShowMenu(false)
  }

  const handlePastePlainText = async () => {
    if (!editor || isReadOnly) return
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        editor.commands.insertContent(text)
        showToast('Pasted Plain Text')
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err)
      showToast('Clipboard access denied')
    }
    setShowMenu(false)
  }

  const handleExportMarkdown = () => {
    if (!editor || !note) return
    const md = htmlToMarkdown(editor.getHTML())
    const filename = `${(note.title || 'Untitled').replace(/[/\\?%*:|"<>]/g, '-')}.md`
    exportAsFile(filename, md, 'text/markdown')
    showToast(`Exported ${filename}`)
    setShowMenu(false)
  }

  const handleImportMarkdownFile = (e) => {
    const file = e.target.files?.[0]
    if (!file || !editor || isReadOnly) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const html = markdownToHtml(text)
      editor.commands.setContent(html, true)
      showToast('Imported Markdown File!')
    }
    reader.readAsText(file)
    e.target.value = ''
    setShowMenu(false)
  }

  const isSoloPane = sidebarCollapsed && notesListCollapsed

  if (!note) {
    return (
      <main className={`editor-panel ${isSoloPane ? 'with-traffic-lights' : ''}`}>
        <header className="editor-toolbar">
          <div className="toolbar-group">
            {sidebarCollapsed && (
              <button 
                className="toolbar-btn" 
                title="Toggle Sidebar (Cmd+\)" 
                onClick={onToggleSidebar}
              >
                <PanelLeft size={16} />
              </button>
            )}
            {notesListCollapsed && (
              <button 
                className="toolbar-btn" 
                title="Toggle Note List (Cmd+Alt+S)" 
                onClick={onToggleNotesList}
              >
                <Columns size={16} />
              </button>
            )}
            <button 
              className="toolbar-btn toolbar-btn-prominent" 
              title="Create Note (Cmd+N)" 
              onClick={onCreateNote}
            >
              <SquarePen size={15} />
              <span style={{ fontSize: '12px' }}>New Note</span>
            </button>
          </div>
        </header>
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <p className="empty-state-text">Select a note or create a new one to begin writing</p>
          <button 
            className="btn-primary" 
            onClick={onCreateNote}
            style={{ marginTop: '12px' }}
          >
            Create Note
          </button>
        </div>
      </main>
    )
  }

  const formattedDate = note.updated_at
    ? format(new Date(note.updated_at), "MMMM d, yyyy 'at' h:mm a")
    : ''

  return (
    <main className={`editor-panel ${isMaximized ? 'maximized' : ''} ${isSoloPane ? 'with-traffic-lights' : ''}`}>
      <header className="editor-toolbar">
        {/* Left Toolbar Items */}
        <div className="toolbar-group">
          {sidebarCollapsed && (
            <button 
              className="toolbar-btn" 
              title="Show Sidebar (Cmd+\)" 
              onClick={onToggleSidebar}
            >
              <PanelLeft size={16} />
            </button>
          )}
          {notesListCollapsed && (
            <button 
              className="toolbar-btn" 
              title="Show Notes List (Cmd+Alt+S)" 
              onClick={onToggleNotesList}
            >
              <Columns size={16} />
            </button>
          )}

          <button 
            className="toolbar-btn toolbar-btn-prominent" 
            title="New Note (Cmd+N)" 
            onClick={onCreateNote}
          >
            <SquarePen size={15} />
            <span style={{ fontSize: '12px' }}>New Note</span>
          </button>

          <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 4px' }} />

          <button
            className={`toolbar-btn ${editor?.isActive('bold') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Bold (Cmd+B)"
            disabled={isReadOnly}
          >
            <Bold size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('italic') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Italic (Cmd+I)"
            disabled={isReadOnly}
          >
            <Italic size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('underline') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            title="Underline (Cmd+U)"
            disabled={isReadOnly}
          >
            <UnderlineIcon size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('strike') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            title="Strikethrough"
            disabled={isReadOnly}
          >
            <Strikethrough size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('highlight') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleHighlight().run()}
            title="Highlight"
            disabled={isReadOnly}
          >
            <Highlighter size={15} />
          </button>

          <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 4px' }} />

          <button
            className={`toolbar-btn ${editor?.isActive('heading', { level: 1 }) ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Title (H1)"
            disabled={isReadOnly}
          >
            <Heading1 size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('heading', { level: 2 }) ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading (H2)"
            disabled={isReadOnly}
          >
            <Heading2 size={15} />
          </button>

          <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 4px' }} />

          <button
            className={`toolbar-btn ${editor?.isActive('bulletList') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title="Bullet List"
            disabled={isReadOnly}
          >
            <List size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('orderedList') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
            disabled={isReadOnly}
          >
            <ListOrdered size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('taskList') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
            title="Checklist"
            disabled={isReadOnly}
          >
            <CheckSquare size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('blockquote') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            title="Quote"
            disabled={isReadOnly}
          >
            <Quote size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('codeBlock') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
            disabled={isReadOnly}
          >
            <Code size={15} />
          </button>
        </div>

        {/* Right Toolbar Items */}
        <div className="toolbar-group">
          {/* Maximize / Focus Mode Button */}
          <button
            className={`toolbar-btn ${isMaximized ? 'active' : ''}`}
            title={isMaximized ? 'Exit Focus Mode (Cmd+Shift+F)' : 'Maximize Note (Cmd+Shift+F)'}
            onClick={onToggleMaximize}
          >
            {isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {!isReadOnly && (
            <>
              <button
                className={`toolbar-btn ${note.is_pinned === 1 ? 'active' : ''}`}
                title={note.is_pinned === 1 ? 'Unpin Note' : 'Pin Note'}
                onClick={() => onUpdateNote({ id: note.id, is_pinned: note.is_pinned === 1 ? 0 : 1 })}
              >
                <Pin size={15} fill={note.is_pinned === 1 ? 'var(--accent-yellow)' : 'none'} />
              </button>

              <button
                className="toolbar-btn"
                title="Move to Trash"
                onClick={() => onTrashNote(note.id)}
              >
                <Trash2 size={15} />
              </button>
            </>
          )}

          {/* Markdown & Clipboard Menu */}
          <div className="dropdown-container">
            <button
              className="toolbar-btn"
              title="Markdown & Clipboard Options"
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
            >
              <MoreHorizontal size={16} />
            </button>

            {showMenu && (
              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                {/* Paste as Markdown */}
                <button className="dropdown-item" onClick={handlePasteMarkdown} disabled={isReadOnly}>
                  <div className="dropdown-item-left">
                    <FileCode size={14} color="var(--accent-yellow)" />
                    <span>Paste as Markdown</span>
                  </div>
                  <span className="dropdown-item-shortcut">⌘⇧M</span>
                </button>

                {/* Paste as Plain Text */}
                <button className="dropdown-item" onClick={handlePastePlainText} disabled={isReadOnly}>
                  <div className="dropdown-item-left">
                    <ClipboardPaste size={14} />
                    <span>Paste as Plain Text</span>
                  </div>
                  <span className="dropdown-item-shortcut">⌘⇧V</span>
                </button>

                <div className="dropdown-divider" />

                {/* Copy as Markdown */}
                <button className="dropdown-item" onClick={handleCopyMarkdown}>
                  <div className="dropdown-item-left">
                    <FileCode size={14} />
                    <span>Copy as Markdown</span>
                  </div>
                </button>

                {/* Copy as Plain Text */}
                <button className="dropdown-item" onClick={handleCopyPlainText}>
                  <div className="dropdown-item-left">
                    <Copy size={14} />
                    <span>Copy as Plain Text</span>
                  </div>
                </button>

                <div className="dropdown-divider" />

                <button className="dropdown-item" onClick={handleExportMarkdown}>
                  <div className="dropdown-item-left">
                    <Download size={14} />
                    <span>Export as Markdown (.md)</span>
                  </div>
                </button>

                <button 
                  className="dropdown-item" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isReadOnly}
                >
                  <div className="dropdown-item-left">
                    <Upload size={14} />
                    <span>Import Markdown (.md)...</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hidden file input for Markdown import */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".md,.markdown,.txt"
        onChange={handleImportMarkdownFile}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 100% Width Scroll Container - Scrollbar is at the rightmost edge of the window! */}
      <div className="editor-scroll-area">
        <div className="editor-document-wrapper">
          <div className="note-date-header">
            {formattedDate}
          </div>
          <EditorContent editor={editor} />
        </div>
      </div>
    </main>
  )
}
