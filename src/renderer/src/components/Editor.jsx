import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { DOMSerializer } from '@tiptap/pm/model'
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
  Columns,
  Table as TableIcon,
  Link as LinkIcon,
  Lock,
  Unlock,
  Scissors,
  Share2,
  PlusSquare,
  MinusSquare,
  Trash
} from 'lucide-react'
import { format } from 'date-fns'
import { htmlToMarkdown, markdownToHtml, copyToClipboard, exportAsFile, tableToPlainText } from '../utils/markdown'
import ContextMenu from './ContextMenu'


function getActiveTableElement(editor) {
  if (!editor) return null
  try {
    const sel = window.getSelection()
    if (sel && sel.anchorNode) {
      const el = sel.anchorNode.nodeType === Node.ELEMENT_NODE ? sel.anchorNode : sel.anchorNode.parentElement
      const table = el?.closest('table')
      if (table) return table
    }
  } catch (e) {}

  try {
    const { state, view } = editor
    const { $from } = state.selection
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === 'table') {
        const dom = view.nodeDOM($from.before(d))
        if (dom && (dom.nodeName === 'TABLE' || dom.tagName === 'TABLE')) return dom
        if (dom?.querySelector) {
          const t = dom.querySelector('table')
          if (t) return t
        }
      }
    }
  } catch (e) {}

  try {
    const activeCell = document.querySelector('.ProseMirror .selectedCell, .ProseMirror td:focus-within, .ProseMirror th:focus-within')
    if (activeCell) return activeCell.closest('table')
  } catch (e) {}

  return null
}

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
  const editorRef = useRef(null)
  const toolbarRef = useRef(null)
  const [showMenu, setShowMenu] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const showToast = useCallback((msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }, [])

  // Helper to extract selected text/HTML or fallback to document
  const getSelectionData = useCallback((editorInstance) => {
    if (!editorInstance) return { hasSelection: false, text: '', markdown: '' }
    const { state } = editorInstance
    const { from, to, empty } = state.selection

    const tableEl = getActiveTableElement(editorInstance)

    if (empty) {
      return {
        hasSelection: false,
        tableEl,
        tableText: tableEl ? tableToPlainText(tableEl) : '',
        tableMarkdown: tableEl ? htmlToMarkdown(tableEl.outerHTML) : '',
        text: editorInstance.getText(),
        markdown: htmlToMarkdown(editorInstance.getHTML())
      }
    }

    // Exact user selection
    let text = ''
    let markdown = ''
    try {
      const slice = state.selection.content()
      const fragment = DOMSerializer.fromSchema(state.schema).serializeFragment(slice.content)
      const tempDiv = document.createElement('div')
      tempDiv.appendChild(fragment)

      const containsTable = tempDiv.querySelector('table')
      if (containsTable) {
        text = tableToPlainText(containsTable)
      } else {
        text = tempDiv.innerText || state.doc.textBetween(from, to, '\n')
      }
      markdown = htmlToMarkdown(tempDiv.innerHTML)
    } catch (e) {
      text = state.doc.textBetween(from, to, '\n')
      markdown = text
    }

    return {
      hasSelection: true,
      tableEl,
      tableText: tableEl ? tableToPlainText(tableEl) : '',
      tableMarkdown: tableEl ? htmlToMarkdown(tableEl.outerHTML) : '',
      text,
      markdown
    }
  }, [])

  // Open Context Menu inside Note
  const triggerEditorContextMenu = useCallback((event, editorInstance) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    const clientX = event?.clientX ?? window.innerWidth / 2
    const clientY = event?.clientY ?? window.innerHeight / 2

    const isLocked = note?.is_locked === 1
    const isInTable = editorInstance?.isActive('table')
    const sel = getSelectionData(editorInstance)

    const menuItems = [
      {
        label: 'Cut',
        icon: <Scissors size={14} />,
        shortcut: '⌘X',
        disabled: isReadOnly || isLocked || !sel.hasSelection,
        action: async () => {
          if (!editorInstance) return
          await copyToClipboard(sel.text)
          editorInstance.commands.deleteSelection()
          showToast('Cut selection')
        }
      },
      {
        label: sel.hasSelection ? 'Copy Selection as Text' : 'Copy as Plain Text',
        icon: <Copy size={14} />,
        shortcut: '⌘C',
        action: async () => {
          await copyToClipboard(sel.text)
          showToast(sel.hasSelection ? 'Copied selected text' : 'Copied note as plain text')
        }
      },
      {
        label: sel.hasSelection ? 'Copy Selection as Markdown' : 'Copy as Markdown',
        icon: <FileCode size={14} />,
        action: async () => {
          await copyToClipboard(sel.markdown)
          showToast(sel.hasSelection ? 'Copied selected Markdown' : 'Copied note as Markdown')
        }
      },
      { type: 'divider' },
      {
        label: 'Paste as Plain Text',
        icon: <ClipboardPaste size={14} />,
        shortcut: '⌘⇧V',
        disabled: isReadOnly || isLocked,
        action: async () => {
          try {
            const text = await navigator.clipboard.readText()
            if (text && editorInstance) {
              editorInstance.commands.insertContent(text)
              showToast('Pasted plain text')
            }
          } catch (err) {
            console.error('Failed to paste:', err)
          }
        }
      },
      {
        label: 'Paste as Markdown',
        icon: <FileText size={14} color="var(--accent-yellow)" />,
        shortcut: '⌘⇧M',
        disabled: isReadOnly || isLocked,
        action: async () => {
          try {
            const text = await navigator.clipboard.readText()
            if (text && editorInstance) {
              const html = markdownToHtml(text)
              editorInstance.commands.insertContent(html)
              showToast('Pasted as Markdown!')
            }
          } catch (err) {
            console.error('Failed to paste markdown:', err)
          }
        }
      },
      { type: 'divider' }
    ]

    // Table operations if cursor is inside a table
    if (isInTable) {
      menuItems.push(
        { type: 'divider' },
        {
          label: 'Copy Table as Markdown',
          icon: <FileCode size={14} color="var(--accent-yellow)" />,
          action: async () => {
            const tableEl = sel.tableEl || getActiveTableElement(editorInstance)
            const md = tableEl ? htmlToMarkdown(tableEl.outerHTML) : sel.tableMarkdown
            if (md) {
              await copyToClipboard(md)
              showToast('Table copied as Markdown!')
            } else {
              showToast('Could not copy table')
            }
          }
        },
        {
          label: 'Copy Table as Plain Text (TSV)',
          icon: <Copy size={14} />,
          action: async () => {
            const tableEl = sel.tableEl || getActiveTableElement(editorInstance)
            const txt = tableEl ? tableToPlainText(tableEl) : sel.tableText
            if (txt) {
              await copyToClipboard(txt)
              showToast('Table copied as Plain Text (TSV)!')
            } else {
              showToast('Could not copy table')
            }
          }
        },
        { type: 'divider' },
        {
          label: 'Add Row Below',
          icon: <PlusSquare size={14} />,
          disabled: isReadOnly || isLocked,
          action: () => editorInstance?.chain().focus().addRowAfter().run()
        },
        {
          label: 'Add Column Right',
          icon: <PlusSquare size={14} />,
          disabled: isReadOnly || isLocked,
          action: () => editorInstance?.chain().focus().addColumnAfter().run()
        },
        {
          label: 'Delete Row',
          icon: <MinusSquare size={14} />,
          disabled: isReadOnly || isLocked,
          action: () => editorInstance?.chain().focus().deleteRow().run()
        },
        {
          label: 'Delete Column',
          icon: <MinusSquare size={14} />,
          disabled: isReadOnly || isLocked,
          action: () => editorInstance?.chain().focus().deleteColumn().run()
        },
        {
          label: 'Delete Table',
          icon: <Trash size={14} />,
          danger: true,
          disabled: isReadOnly || isLocked,
          action: () => editorInstance?.chain().focus().deleteTable().run()
        }
      )
    }

    menuItems.push(
      {
        label: 'Insert Checklist',
        icon: <CheckSquare size={14} />,
        disabled: isReadOnly || isLocked,
        action: () => editorInstance?.chain().focus().toggleTaskList().run()
      },
      {
        label: 'Add Table',
        icon: <TableIcon size={14} />,
        disabled: isReadOnly || isLocked,
        action: () => editorInstance?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      },
      {
        label: 'Add Link',
        icon: <LinkIcon size={14} />,
        shortcut: '⌘K',
        disabled: isReadOnly || isLocked,
        action: () => {
          const currentLink = editorInstance?.getAttributes('link').href || ''
          setLinkUrl(currentLink)
          setShowLinkModal(true)
        }
      }
    )

    setContextMenu({
      x: clientX,
      y: clientY,
      items: menuItems
    })
  }, [note?.is_locked, isReadOnly, getSelectionData, showToast])

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
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: 'Type something or start with a title...'
      })
    ],
    content: note ? note.content : '',
    editable: !isReadOnly && note?.is_locked !== 1,
    editorProps: {
      handleDOMEvents: {
        contextmenu: (view, event) => {
          triggerEditorContextMenu(event, editorRef.current)
          return true
        },
        copy: (view, event) => {
          const { state } = view
          const { from, to, empty } = state.selection
          if (empty) return false

          try {
            const slice = state.selection.content()
            const fragment = DOMSerializer.fromSchema(state.schema).serializeFragment(slice.content)
            const tempDiv = document.createElement('div')
            tempDiv.appendChild(fragment)

            const containsTable = tempDiv.querySelector('table')
            let plainText = ''
            if (containsTable) {
              plainText = tableToPlainText(containsTable)
            } else {
              plainText = tempDiv.innerText || state.doc.textBetween(from, to, '\n')
            }

            event.clipboardData.setData('text/plain', plainText)
            event.clipboardData.setData('text/html', tempDiv.innerHTML)
            event.preventDefault()
            return true
          } catch (e) {
            return false
          }
        }
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain')
        if (text && (text.includes('# ') || text.includes('- [ ]') || text.includes('- [x]') || text.includes('```') || text.includes('**') || text.includes('---') || text.includes('|'))) {
          const parsedHtml = markdownToHtml(text)
          editorRef.current?.commands.insertContent(parsedHtml)
          return true
        }
        return false
      }
    },
    onUpdate: ({ editor }) => {
      if (!note || isReadOnly || note.is_locked === 1) return

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

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Sync content when note selection changes
  useEffect(() => {
    if (editor && note) {
      if (editor.getHTML() !== note.content) {
        editor.commands.setContent(note.content || '', false)
      }
      editor.setEditable(!isReadOnly && note.is_locked !== 1)
    }
  }, [note?.id, note?.is_locked, isReadOnly])

  // Enable smooth horizontal scrolling with mouse wheel over the toolbar
  useEffect(() => {
    const el = toolbarRef.current
    if (!el) return
    const handleWheel = (e) => {
      if (e.deltaY !== 0 && e.deltaX === 0) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

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
    const sel = getSelectionData(editor)
    await copyToClipboard(sel.markdown)
    showToast(sel.hasSelection ? 'Copied selection as Markdown!' : 'Copied note as Markdown!')
    setShowMenu(false)
  }

  const handleCopyPlainText = async () => {
    if (!editor) return
    const sel = getSelectionData(editor)
    await copyToClipboard(sel.text)
    showToast(sel.hasSelection ? 'Copied selection as plain text!' : 'Copied note as plain text!')
    setShowMenu(false)
  }

  const handlePasteMarkdown = async () => {
    if (!editor || isReadOnly || note?.is_locked === 1) return
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
    if (!editor || isReadOnly || note?.is_locked === 1) return
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        editor.commands.insertContent(text)
        showToast('Pasted plain text')
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err)
      showToast('Clipboard access denied')
    }
    setShowMenu(false)
  }

  const handleAddTable = () => {
    if (!editor || isReadOnly || note?.is_locked === 1) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    showToast('Table inserted')
  }

  const handleApplyLink = (e) => {
    e.preventDefault()
    if (!editor) return
    if (linkUrl.trim()) {
      let href = linkUrl.trim()
      if (!href.startsWith('http://') && !href.startsWith('https://')) {
        href = `https://${href}`
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
      showToast('Link added')
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setLinkUrl('')
    setShowLinkModal(false)
  }

  const handleShareNote = async () => {
    if (!editor || !note) return
    const md = htmlToMarkdown(editor.getHTML())
    await copyToClipboard(md || note.title)
    showToast('Note copied to clipboard as Markdown! Ready to share.')
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
    if (!file || !editor || isReadOnly || note?.is_locked === 1) return

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
  const isLocked = note?.is_locked === 1
  const isInTable = editor?.isActive('table') || Boolean(getActiveTableElement(editor))

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
            <header className="editor-toolbar" ref={toolbarRef}>
        {/* Navigation & New Note */}
        <div className="toolbar-group">
          {sidebarCollapsed && (
            <button 
              className="toolbar-btn" 
              title="Show Sidebar (Cmd+\\)" 
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
            onClick={() => onCreateNote()}
          >
            <SquarePen size={15} />
            <span>New</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Text Style Tools */}
        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${editor?.isActive("bold") ? "active" : ""}`}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Bold (Cmd+B)"
            disabled={isReadOnly || isLocked}
          >
            <Bold size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive("italic") ? "active" : ""}`}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Italic (Cmd+I)"
            disabled={isReadOnly || isLocked}
          >
            <Italic size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive("underline") ? "active" : ""}`}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            title="Underline (Cmd+U)"
            disabled={isReadOnly || isLocked}
          >
            <UnderlineIcon size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive("strike") ? "active" : ""}`}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            title="Strikethrough"
            disabled={isReadOnly || isLocked}
          >
            <Strikethrough size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive("highlight") ? "active" : ""}`}
            onClick={() => editor?.chain().focus().toggleHighlight().run()}
            title="Highlight"
            disabled={isReadOnly || isLocked}
          >
            <Highlighter size={15} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Headings */}
        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${editor?.isActive("heading", { level: 1 }) ? "active" : ""}`}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Title (H1)"
            disabled={isReadOnly || isLocked}
          >
            <Heading1 size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive("heading", { level: 2 }) ? "active" : ""}`}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading (H2)"
            disabled={isReadOnly || isLocked}
          >
            <Heading2 size={15} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Lists & Inserts */}
        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${editor?.isActive("taskList") ? "active" : ""}`}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
            title="Checklist"
            disabled={isReadOnly || isLocked}
          >
            <CheckSquare size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive("bulletList") ? "active" : ""}`}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title="Bullet List"
            disabled={isReadOnly || isLocked}
          >
            <List size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive("orderedList") ? "active" : ""}`}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
            disabled={isReadOnly || isLocked}
          >
            <ListOrdered size={15} />
          </button>
          <button
            className={`toolbar-btn ${isInTable ? "active" : ""}`}
            onClick={handleAddTable}
            title="Add Table"
            disabled={isReadOnly || isLocked}
          >
            <TableIcon size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive("link") ? "active" : ""}`}
            onClick={() => {
              const currentLink = editor?.getAttributes("link").href || ""
              setLinkUrl(currentLink)
              setShowLinkModal(true)
            }}
            title="Add Link (Cmd+K)"
            disabled={isReadOnly || isLocked}
          >
            <LinkIcon size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive("blockquote") ? "active" : ""}`}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            title="Quote"
            disabled={isReadOnly || isLocked}
          >
            <Quote size={15} />
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive("codeBlock") ? "active" : ""}`}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
            disabled={isReadOnly || isLocked}
          >
            <Code size={15} />
          </button>
        </div>

        {/* Dynamic Table Actions if in Table */}
        {isInTable && (
          <>
            <div className="toolbar-divider" />
            <div className="toolbar-group table-toolbar-group">
              <button
                className="toolbar-btn"
                title="Add Row Below"
                onClick={() => editor?.chain().focus().addRowAfter().run()}
              >
                <PlusSquare size={14} />
                <span style={{ fontSize: "11px", marginLeft: "3px" }}>+Row</span>
              </button>
              <button
                className="toolbar-btn"
                title="Add Column Right"
                onClick={() => editor?.chain().focus().addColumnAfter().run()}
              >
                <PlusSquare size={14} />
                <span style={{ fontSize: "11px", marginLeft: "3px" }}>+Col</span>
              </button>
              <button
                className="toolbar-btn"
                title="Delete Row"
                onClick={() => editor?.chain().focus().deleteRow().run()}
              >
                <MinusSquare size={14} />
                <span style={{ fontSize: "11px", marginLeft: "3px" }}>-Row</span>
              </button>
              <button
                className="toolbar-btn"
                title="Delete Column"
                onClick={() => editor?.chain().focus().deleteColumn().run()}
              >
                <MinusSquare size={14} />
                <span style={{ fontSize: "11px", marginLeft: "3px" }}>-Col</span>
              </button>
              <button
                className="toolbar-btn"
                title="Copy Table as Markdown"
                onClick={async () => {
                  const tableEl = getActiveTableElement(editorRef.current)
                  const md = tableEl ? htmlToMarkdown(tableEl.outerHTML) : ""
                  if (md) {
                    await copyToClipboard(md)
                    showToast("Table copied as Markdown!")
                  } else {
                    showToast("Could not copy table")
                  }
                }}
              >
                <FileCode size={14} color="var(--accent-yellow)" />
                <span style={{ fontSize: "11px", marginLeft: "3px" }}>Copy</span>
              </button>
              <button
                className="toolbar-btn"
                title="Delete Table"
                style={{ color: "var(--accent-red)" }}
                onClick={() => editor?.chain().focus().deleteTable().run()}
              >
                <Trash size={14} />
              </button>
            </div>
          </>
        )}

        <div className="toolbar-divider" />

        {/* Note Actions & Options */}
        <div className="toolbar-group">
          {/* Share Note Button */}
          <button
            className="toolbar-btn"
            title="Share Note (Copy Markdown)"
            onClick={handleShareNote}
          >
            <Share2 size={15} />
          </button>

          {/* Maximize / Focus Mode Button */}
          <button
            className={`toolbar-btn ${isMaximized ? "active" : ""}`}
            title={isMaximized ? "Exit Focus Mode (Cmd+Shift+F)" : "Maximize Note (Cmd+Shift+F)"}
            onClick={onToggleMaximize}
          >
            {isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {!isReadOnly && (
            <>
              {/* Pin Note */}
              <button
                className={`toolbar-btn ${note.is_pinned === 1 ? "active" : ""}`}
                title={note.is_pinned === 1 ? "Unpin Note" : "Pin Note"}
                onClick={() => onUpdateNote({ id: note.id, is_pinned: note.is_pinned === 1 ? 0 : 1 })}
              >
                <Pin size={15} fill={note.is_pinned === 1 ? "var(--accent-yellow)" : "none"} />
              </button>

              {/* Lock Note */}
              <button
                className={`toolbar-btn ${isLocked ? "active" : ""}`}
                title={isLocked ? "Unlock Note" : "Lock Note"}
                onClick={() => {
                  onUpdateNote({ id: note.id, is_locked: isLocked ? 0 : 1 })
                  showToast(isLocked ? "Note Unlocked" : "Note Locked")
                }}
              >
                {isLocked ? <Lock size={15} color="var(--accent-yellow)" /> : <Unlock size={15} />}
              </button>

              {/* Trash Note */}
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
                <button className="dropdown-item" onClick={handlePasteMarkdown} disabled={isReadOnly || isLocked}>
                  <div className="dropdown-item-left">
                    <FileCode size={14} color="var(--accent-yellow)" />
                    <span>Paste as Markdown</span>
                  </div>
                  <span className="dropdown-item-shortcut">⌘⇧M</span>
                </button>

                {/* Paste as Plain Text */}
                <button className="dropdown-item" onClick={handlePastePlainText} disabled={isReadOnly || isLocked}>
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
                  disabled={isReadOnly || isLocked}
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

      {/* 100% Width Scroll Container - Scrollbar is at the rightmost edge of the window */}
      <div 
        className="editor-scroll-area"
        onContextMenu={(e) => triggerEditorContextMenu(e, editorRef.current)}
      >
        <div className="editor-document-wrapper">
          <div className="note-date-header">
            {formattedDate} {isLocked ? '• 🔒 Locked' : ''}
          </div>
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Context Menu inside note */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Link Input Modal */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Add / Edit Link</h3>
            <form onSubmit={handleApplyLink}>
              <input 
                type="text" 
                className="modal-input" 
                placeholder="https://example.com"
                autoFocus
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowLinkModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Apply Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
