# Peernotes

A private macOS app to log honest notes about your teammates. Capture moments as they happen — positive, neutral, or negative — then surface them when review season comes.

## Features

- **Global shortcut** — Press `⌃⌘⌥Space` from anywhere to pop up a quick-entry panel. No app-switching required.
- **In-app note button** — `+ Note` button in the title bar for mouse-driven workflows.
- **Sentiment tagging** — Every note is tagged positive, neutral, or negative with colour-coded badges.
- **Two views** — A global timeline and a per-person feed grouped by month.
- **Full-text search** — Search across note content and people names from the title bar.
- **Export** — Export all notes or narrow to a date range. Copy JSON to clipboard or save to file.
- **Import** — Restore from a previous export file. Duplicate notes and people are silently skipped.
- **Settings** — Theme switcher (Auto / Light / Dark) and data management in a dedicated tab.
- **Local-only** — All data stays on your machine in a SQLite database in `~/Library/Application Support/peernotes`.

## Tech stack

| Layer | Tech |
|-------|------|
| Shell | Electron 28 |
| Build | electron-vite 2 |
| UI | React 18 + TypeScript 5 + styled-components v6 |
| Storage | better-sqlite3 (synchronous SQLite) |
| IDs | uuid v9 |

## Project structure

```
src/
├── main/
│   ├── index.ts          # App entry, IPC registration, lifecycle
│   ├── windows.ts        # Main window + quick-entry overlay, notifyMainWindow()
│   ├── store/
│   │   └── db.ts         # SQLite connection, WAL mode, migrations
│   └── ipc/
│       ├── notes.ts      # notes:add, notes:list, notes:remove
│       ├── people.ts     # people:add, people:list, people:remove
│       ├── export.ts     # export:run, export:saveFile
│       ├── import.ts     # import:openFile, notes:import
│       └── settings.ts   # settings:reset
├── preload/
│   └── index.ts          # contextBridge — exposes window.api
├── renderer/
│   ├── app/              # Main dashboard window
│   │   ├── App.tsx
│   │   ├── theme/        # Design tokens, styled-components theme
│   │   ├── hooks/        # usePeople, useNotes, useThemeMode
│   │   └── components/
│   │       ├── atoms/    # Button, TextArea
│   │       ├── molecules/# ModalShell, NoteCard, PersonSelector, SentimentPicker
│   │       └── organisms/# Timeline, PersonView, PeopleManager, Settings,
│   │                     #   AddNoteModal, ExportModal, ImportModal
│   └── quick-entry/      # Floating overlay window (global shortcut target)
└── shared/
    └── types.ts          # Shared TypeScript types and constants
```

## Getting started

### Prerequisites

- macOS 12 Monterey or later
- Node.js 20+

### Install

```bash
npm install
```

The `postinstall` script rebuilds `better-sqlite3` against the bundled Electron Node.js ABI automatically.

### Development

```bash
npm run dev
```

Opens both the main window and enables hot-reload via electron-vite.

### Build

```bash
npm run build
```

Output lands in `out/`.

### Package locally

```bash
npm run package
```

Builds then packages a `.dmg` for your current architecture into `dist/`.

## Releasing

Releases are built automatically by GitHub Actions when you push a version tag. The workflow builds a native DMG for both Apple Silicon and Intel, then attaches them to a GitHub Release.

**Steps:**

1. Bump the version in `package.json`:
   ```bash
   npm version patch   # or minor / major
   ```

2. Push the commit and the generated tag:
   ```bash
   git push origin main --follow-tags
   ```

That's it. The [`release` workflow](.github/workflows/release.yml) triggers on the new tag, builds both DMGs in parallel, and publishes them to the [Releases page](https://github.com/whispyy/peernotes/releases).

> **Note on Gatekeeper** — the DMGs are unsigned (no Apple Developer certificate). On first launch, right-click the app → Open, then confirm. After that it opens normally.

## IPC API

All channels are registered via `ipcMain.handle` and exposed through `contextBridge` as `window.api`.

| Namespace | Method | Description |
|-----------|--------|-------------|
| `notes` | `add(payload)` | Add a note |
| `notes` | `list()` | Return all notes |
| `notes` | `remove(id)` | Delete a note by ID |
| `people` | `add(name)` | Add a person (TOCTOU-safe transaction) |
| `people` | `list()` | Return all people |
| `people` | `remove(id)` | Delete a person and cascade-delete their notes |
| `export` | `run({ from?, to? })` | Build export payload, optionally filtered by date |
| `export` | `saveFile(json, filename)` | Open save dialog and write JSON to disk |
| `import` | `openFile()` | Open file picker, return `{ content, name }` or `null` |
| `import` | `run(payload)` | Import notes from parsed payload, returns counts |
| `data` | `reset()` | Delete all notes and people |

## Data format

### Export / import schema

```jsonc
{
  "version": 1,
  "exportedAt": "2026-04-14T10:00:00.000Z",
  "from": null,          // ISO date string or null
  "to": null,
  "total": 42,
  "people": [
    { "id": "uuid", "name": "Alice Smith", "createdAt": "2026-01-01T00:00:00.000Z" }
  ],
  "notes": [
    {
      "id": "uuid",
      "personId": "uuid",
      "person": "Alice Smith",   // human-readable, kept for portability
      "sentiment": "positive",
      "note": "Great job on the incident response.",
      "timestamp": "2026-04-12T14:30:00.000Z"
    }
  ]
}
```

The importer accepts both v1 files (with `people[]`) and legacy notes-only files. Duplicate IDs are silently skipped via `INSERT OR IGNORE`.

## Database schema

```sql
CREATE TABLE people (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL
);

CREATE TABLE notes (
  id         TEXT PRIMARY KEY,
  person_id  TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  sentiment  TEXT NOT NULL CHECK(sentiment IN ('positive','neutral','negative')),
  note       TEXT NOT NULL,
  timestamp  TEXT NOT NULL
);
```

WAL mode is enabled. Foreign key enforcement is on. Schema migrations are wrapped in a transaction so a mid-migration crash leaves the schema untouched and is safely re-attempted on next launch.

## License

MIT
