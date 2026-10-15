# OpenNotes 📝

An open-source, cross-platform Notes application built with **Electron**, **React**, **TipTap**, and **SQLite**, inspired by the macOS Apple Notes interface and reverse-engineered architecture.

---

## 🏗 Architecture Mapping

Based on the reverse engineering of macOS `Notes.app`:

| Apple Notes Architecture | OpenNotes Implementation | Description |
| :--- | :--- | :--- |
| **`NF*` (NotesFramework)** | `better-sqlite3` + IPC handlers (`src/main/index.js`) | Offline-first SQLite database schema with folders, notes, tags, and full-text search. |
| **`IC*` / `ICM*` (UI Controllers)** | React 18 + TipTap Editor (`src/renderer/src/`) | 3-column split view (Sidebar, Note List, Rich Text Editor) with dark mode glassmorphic styling. |
| **CloudKit Sync Queue** | SQLite Transaction Store + Extensible Sync Engine | Ready for CRDT / WebSocket replication across devices. |
| **Rich Text (ICTextView)** | TipTap (ProseMirror) | Full rich text formatting (headings, checklists, code blocks, quotes, highlights). |

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
Run both Electron main and Vite renderer with hot-module replacement:
```bash
npm run dev
```

### 3. Build & Package

#### For macOS:
```bash
npm run build
npx electron-builder --mac
```

#### For Windows:
```bash
npm run build
npx electron-builder --win
```

---

## 🎨 Features
- **3-Pane Apple Notes Layout**: Collapsible Sidebar, Note Index list, and distraction-free Editor.
- **TipTap Rich Text Suite**: Checklists, Headings, Highlights, Code Blocks, Quotes, and Underline.
- **Dynamic Title & Snippet Extraction**: Automatically derives note titles and search previews as you type.
- **Pinned Notes & Trash Recovery**: Fast pin toggling and a soft-delete trash bin with one-click restore.
- **Zero Cloud Lock-in**: All notes are stored locally in SQLite (`notes.db`).
