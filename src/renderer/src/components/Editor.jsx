import React, { useEffect, useRef } from 'react'
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
  FileText
} from 'lucide-react'
import { format } from 'date-fns'

export default function Editor({ 
  note, 
  onUpdateNote, 
  onTrashNote, 
  isReadOnly 
}) {
  const saveTimeoutRef = useRef(null)

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
      }, 400)
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

  if (!note) {
    return (
      <main className="editor-panel">
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <p className="empty-state-text">Select or create a note to start writing</p>
        </div>
      </main>
    )
  }

  const formattedDate = note.updated_at
    ? format(new Date(note.updated_at), "MMMM d, yyyy 'at' h:mm a")
    : ''

  return (
    <main className="editor-panel">
      <header className="editor-toolbar">
        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${editor?.isActive('bold') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Bold"
            disabled={isReadOnly}
          >
            <Bold size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('italic') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Italic"
            disabled={isReadOnly}
          >
            <Italic size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('underline') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            title="Underline"
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

          <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 6px' }} />

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

          <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 6px' }} />

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

        <div className="toolbar-group">
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
        </div>
      </header>

      <div className="editor-content-area">
        <div className="note-date-header">
          {formattedDate}
        </div>
        <EditorContent editor={editor} />
      </div>
    </main>
  )
}
