# OpenNotes 📝

An open-source, cross-platform Notes application built with **Electron**, **React**, **TipTap**, and a persistent local database engine, inspired by the macOS Apple Notes interface and reverse-engineered architecture.

---

## 🚀 Key Features

### 1. File & Note Management
- **One-Click New Note**: Dedicated prominent button in the toolbar, notes panel, and via `Cmd+N` / `Ctrl+N`.
- **Collapsible Panes**: Collapse or expand the **Sidebar** and **Notes List** independently for a customized workspace.
- **Focus / Maximize Mode**: Click the Maximize button (or press `Cmd+Shift+F` / `Ctrl+Shift+F`) to expand the editor to 100% full window, hiding sidebars for distraction-free writing.
- **Collapsible Sections**: Expand and collapse Folders and Tags with quick-toggle chevron arrows.

### 2. View Switcher: List & Large Square Gallery
- **List View**: Classic Apple Notes row list with title, last updated timestamp, and content snippet.
- **Gallery / Grid View**: Large square preview cards simulating physical paper notes with content excerpts, titles, and dates.

### 3. Markdown & Clipboard Superpowers
- **Copy as Markdown**: Instantly convert rich text note formatting into clean Markdown (`#`, lists, `- [ ]`, code blocks, bold, etc.) and copy to clipboard.
- **Copy as Plain Text**: Copy unformatted text directly.
- **Paste as Plain Text**: Cleanly insert clipboard text without unwanted styles.
- **Auto Markdown Paste**: Pasting raw Markdown into the editor automatically converts it into rich formatting.
- **Import & Export `.md`**:
  - Export any note as a `.md` file to disk.
  - Import external `.md` files directly into your notes.

### 4. Rich Text Formatting (TipTap / ProseMirror)
- **Interactive Checklists**: Clickable checkboxes with strike-through completion.
- **Headings & Hierarchy**: Title (H1) and Headings (H2/H3).
- **Text Styles**: Bold, Italic, Underline, Strikethrough, Code, and Highlight.
- **Code Blocks & Quotes**: Monospace code blocks and blockquotes with yellow accent bar.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Cmd+N` / `Ctrl+N`** | Create New Note |
| **`Cmd+Shift+F` / `Ctrl+Shift+F`** | Toggle Focus / Maximize Mode |
| **`Cmd+B` / `Ctrl+B`** | Bold Text |
| **`Cmd+I` / `Ctrl+I`** | Italic Text |
| **`Cmd+U` / `Ctrl+U`** | Underline Text |

---

## 🏗 Architecture Mapping

Based on the reverse engineering of macOS `Notes.app`:

| Apple Notes Architecture | OpenNotes Implementation | Description |
| :--- | :--- | :--- |
| **`NF*` (NotesFramework)** | `src/main/index.js` | Persistent atomic local database (`notes-data.json`), folders, tags, and search engine. |
| **`IC*` / `ICM*` (UI Controllers)** | `src/renderer/src/` | 3-pane responsive layout (Sidebar, Notes List, TipTap Editor) with glassmorphism & dark mode. |
| **`ICTextView` (Rich Text)** | `Editor.jsx` + TipTap | ProseMirror-based rich text with interactive checklists and Markdown converter. |

---

## 🚀 Running & Building

### Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Packaging Binaries
- **macOS**: `npm run build && npx electron-builder --mac`
- **Windows**: `npm run build && npx electron-builder --win`
