# Peernotes

A private macOS app to log honest notes about your teammates. Capture moments as they happen — positive, neutral, or negative — then surface them when review season comes.

## Features

- **Workspaces** — Organise notes across multiple contexts (e.g. "Team Alpha", "Consulting", "Personal"). Each workspace has its own people and notes; switching workspaces changes everything the app shows. The quick-entry overlay always targets the last active workspace.
- **Global shortcut** — Press `⌃⌘⌥Space` from anywhere to pop up a quick-entry panel. No app-switching required.
- **In-app note button** — `+ Note` button in the title bar for mouse-driven workflows.
- **Sentiment tagging** — Every note is tagged positive, neutral, or negative with colour-coded badges.
- **Two views** — A global timeline and a per-person feed grouped by month.
- **Full-text search** — Search across note content and people names from the title bar.
- **Export** — Export all notes or narrow to a date range, scoped to the active workspace. Copy JSON to clipboard or save to file.
- **Import** — Restore from a previous export file into the active workspace. Duplicate notes and people are silently skipped.
- **AI Summaries** — Generate smart summaries of a person's notes over any date range using a model of your choice via OpenRouter. Choose a purpose preset (review prep, retro prep, etc.) to shape how the summary is written. Results appear as a dismissible banner and can be saved as a neutral note.
- **Settings** — Theme switcher (Auto / Light / Dark), AI summary configuration, and data management in a dedicated tab.
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
│       ├── workspaces.ts # workspace:list/add/rename/remove/getActive/setActive
│       ├── export.ts     # export:run, export:saveFile
│       ├── import.ts     # import:openFile, notes:import
│       ├── settings.ts   # settings:reset
│       └── ai.ts         # ai:settings:get/set, ai:purposes:*, ai:summarize
├── preload/
│   └── index.ts          # contextBridge — exposes window.api
├── renderer/
│   ├── app/              # Main dashboard window
│   │   ├── App.tsx
│   │   ├── theme/        # Design tokens, styled-components theme
│   │   ├── hooks/        # usePeople, useNotes, useWorkspaces, useThemeMode, useAiSettings
│   │   └── components/
│   │       ├── atoms/    # Button, TextArea
│   │       ├── molecules/# ModalShell, NoteCard, PersonSelector, SentimentPicker
│   │       └── organisms/# Timeline, PersonView, PeopleManager, Settings,
│   │                     #   AddNoteModal, ExportModal, ImportModal, WorkspaceSelector
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

> **Note on Gatekeeper** — the DMGs are unsigned (no Apple Developer certificate). macOS Ventura and later may show "Peernotes is damaged and can't be opened" instead of the usual unverified-developer prompt. Fix: open **System Settings → Privacy & Security** and click **Open Anyway**, or run this once in Terminal:
> ```bash
> xattr -cr /Applications/Peernotes.app
> ```
> After that it opens normally.

## IPC API

All channels are registered via `ipcMain.handle` and exposed through `contextBridge` as `window.api`.

| Namespace | Method | Description |
|-----------|--------|-------------|
| `workspace` | `list()` | Return all workspaces |
| `workspace` | `add(name)` | Create a workspace |
| `workspace` | `rename(id, name)` | Rename a workspace |
| `workspace` | `remove(id)` | Delete a workspace and cascade-delete its people and notes |
| `workspace` | `getActive()` | Return the active workspace ID (in-memory, main process) |
| `workspace` | `setActive(id)` | Set the active workspace ID |
| `notes` | `add(payload)` | Add a note |
| `notes` | `list(workspaceId)` | Return notes scoped to the given workspace |
| `notes` | `remove(id)` | Delete a note by ID |
| `people` | `add(workspaceId, name)` | Add a person to a workspace |
| `people` | `list(workspaceId)` | Return people in the given workspace |
| `people` | `remove(id)` | Delete a person and cascade-delete their notes |
| `export` | `run({ workspaceId, from?, to? })` | Build export payload for the given workspace, optionally filtered by date |
| `export` | `saveFile(json, filename)` | Open save dialog and write JSON to disk |
| `import` | `openFile()` | Open file picker, return `{ content, name }` or `null` |
| `import` | `run(payload, workspaceId)` | Import notes into the given workspace, returns counts |
| `data` | `reset(workspaceId?)` | Delete all notes and people in the given workspace |
| `ai.settings` | `get()` | Return AI settings (enabled, apiKey, model, purposes) |
| `ai.settings` | `set(patch)` | Update one or more AI settings fields |
| `ai.purposes` | `add(payload)` | Create a purpose preset |
| `ai.purposes` | `update(payload)` | Update a purpose preset |
| `ai.purposes` | `remove(id)` | Delete a purpose preset |
| `ai` | `summarize(payload)` | Call OpenRouter and return a summary string |

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
CREATE TABLE workspaces (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL
);

CREATE TABLE people (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  UNIQUE(workspace_id, name)
);

CREATE TABLE notes (
  id         TEXT PRIMARY KEY,
  person_id  TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  sentiment  TEXT NOT NULL CHECK(sentiment IN ('positive','neutral','negative')),
  note       TEXT NOT NULL,
  timestamp  TEXT NOT NULL
);

CREATE TABLE ai_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
  -- keys: enabled, api_key, model
);

CREATE TABLE ai_purposes (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0
);
```

WAL mode is enabled. Foreign key enforcement is on. Schema migrations are wrapped in a transaction so a mid-migration crash leaves the schema untouched and is safely re-attempted on next launch.

## AI Summaries

AI Summaries are powered by [OpenRouter](https://openrouter.ai), which gives you access to any model (Claude, GPT-4o, Mistral, Llama, etc.) with a single API key.

### Setup

1. Create an account at [openrouter.ai](https://openrouter.ai) and generate an API key.
2. In Peernotes, open **Settings → AI Summaries** and enable the toggle.
3. Paste your API key and enter the model string exactly as OpenRouter expects it (e.g. `anthropic/claude-3.5-sonnet`, `openai/gpt-4o`, `mistralai/mistral-7b-instruct`).
4. Create one or more **purpose presets** — each preset has a name and a system prompt that shapes how summaries are written.

### Generating a summary

1. Switch to the **By Person** tab and select a person.
2. Click **✦ Summarize** in the top-right of the feed.
3. Pick a date range and a purpose preset, then click **✦ Generate**.
4. The summary appears as a banner above the notes. You can **Dismiss** it, **Regenerate** with different settings, or **Save as note** to persist it as a neutral note with a `[AI Summary: …]` label.

### Example purpose presets

| Name | System prompt |
|------|---------------|
| Review Prep | You are a helpful assistant preparing bi-annual performance review notes. Given a list of observations about a team member, write a concise narrative summary that highlights key themes, strengths, and areas of growth. Be constructive and professional. |
| Retro Prep | You are summarizing sprint retrospective notes. Highlight standout contributions, shout-outs, and recurring positive patterns from the notes provided. Keep it brief and celebratory. |

## License

MIT
