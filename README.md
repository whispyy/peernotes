# Peernotes

A private macOS app to log honest notes about your teammates. Capture moments as they happen — positive, neutral, or negative — then surface them when review season comes.

## Features

- **Workspaces** — Organise notes across multiple contexts (e.g. "Team Alpha", "Consulting", "Personal"). Each workspace has its own people and notes; switching workspaces changes everything the app shows. The quick-entry overlay always targets the last active workspace.
- **Global shortcut** — Press `⌃⌘⌥Space` from anywhere to pop up a quick-entry panel. No app-switching required. Rebindable under **Settings → Shortcuts**.
- **In-app note button** — `+ Note` button in the title bar for mouse-driven workflows.
- **Sentiment tagging** — Every note is tagged positive, neutral, or negative with colour-coded badges.
- **Three views** — A global **Timeline** of every note; a **People** tab where the sidebar doubles as the person picker and the entry point to **Manage team** (add, rename, archive, restore, remove), and selecting a name shows that person's feed grouped by month; and a **Knowledge** tab holding the generated wiki.
- **Knowledge base** — Each note is filed into one or two AI-chosen topics as it is saved, and every topic becomes a short markdown article written from those notes, with inline citations that open the underlying note. Ask a question in plain language and get an answer drawn only from your own notes. See [Knowledge base](#knowledge-base).
- **Markdown notes** — Notes are written and rendered as GitHub-flavored markdown, up to 10,000 characters. Pasting rich text converts the HTML to markdown automatically.
- **Image attachments** — Up to 5 images per note, stored as files in `~/Library/Application Support/peernotes/attachments`. Thumbnails render inline with a click-to-fullscreen lightbox.
- **Search** — Substring match across note content and people names from the title bar. Archived people and their notes are excluded from results.
- **Export** — Export all notes or narrow to a date range, scoped to the active workspace. Copy JSON to clipboard or save to file.
- **Import** — Restore from a previous export file into the active workspace. Duplicate notes and people are silently skipped.
- **AI Summaries** — Generate smart summaries of a person's notes over any date range using a model of your choice via OpenRouter. Choose a purpose preset (review prep, retro prep, etc.) to shape how the summary is written. Results appear as a dismissible banner and can be saved as a neutral note.
- **Settings** — Theme switcher (Auto / Light / Dark), quick-entry shortcut, AI summary and knowledge base configuration, sync, and data management in a dedicated tab.
- **Local-only** — All data stays on your machine: a SQLite database, attachment files, and knowledge base markdown in `~/Library/Application Support/peernotes`.
- **GitHub Sync** — Back up and restore the active workspace to a file in a GitHub repository, with knowledge base articles mirrored alongside it as markdown. Supports manual push/pull and optional background auto-sync on a configurable interval (5 min → 24 h). Requires a GitHub Personal Access Token with `repo` (or `contents:write`) scope. See [GitHub Sync](#github-sync).
- **iCloud Sync** — Mirror the active workspace through a folder in iCloud Drive, image files included. Pushes every 15 minutes and pulls as soon as another Mac writes a change. See [iCloud Sync](#icloud-sync).
- **Menu bar tray** — New Note, Open App, and Check for Updates… from the tray icon. The update check also runs 3 s after launch and offers to download the newer DMG from the GitHub Releases API.

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
│   ├── windows.ts        # Main window + quick-entry overlay, notifyMainWindow(), notifySyncUpdated()
│   ├── updater.ts        # Update check + DMG download from the GitHub Releases API
│   ├── store/
│   │   └── db.ts         # SQLite connection, WAL mode, migrations (v1–v11)
│   ├── kb/               # Knowledge base — markdown docs on disk, no tables
│   │   ├── paths.ts      # kb/<workspaceId>/ layout, slugify, atomic writes
│   │   ├── doc.ts        # Frontmatter read/write, staleness, _index.md, KB lock
│   │   ├── notes.ts      # Live-note lookups + prompt formatting
│   │   ├── openrouter.ts # Shared chat() client and AI-readiness check
│   │   ├── classify.ts   # Files one note into topics (cheap classifier model)
│   │   ├── generate.ts   # Rewrites a topic doc from its notes, with citations
│   │   ├── ask.ts        # Local doc pre-filter + question answering
│   │   └── rebuild.ts    # Wipe and re-file every note in a workspace
│   └── ipc/
│       ├── notes.ts      # notes:add/update/remove, list, search, count, list-for-person
│       ├── people.ts     # people:add/rename/archive/restore/remove, list, list-archived
│       ├── workspaces.ts # workspace:list/add/rename/remove/getActive/setActive
│       ├── attachments.ts# attachments:list/pick/add/remove/getPath
│       ├── shortcut.ts   # shortcut:get/set, global shortcut registration
│       ├── export.ts     # notes:export, export:saveFile/saveText, buildExport()
│       ├── import.ts     # import:openFile, notes:import, performImport()
│       ├── settings.ts   # settings:reset
│       ├── ai.ts         # ai:settings:get/set, ai:purposes:*
│       ├── kb.ts         # kb:status/read/file-unfiled/regenerate/rebuild/ask/open-folder
│       ├── sync.ts       # sync:settings:get/set, sync:push, sync:pull, auto-sync timer
│       └── icloud-sync.ts# icloud:settings:get/set, icloud:push/pull, folder watcher
├── preload/
│   └── index.ts          # contextBridge — exposes window.api
├── renderer/
│   ├── app/              # Main dashboard window
│   │   ├── App.tsx       # Tabs: Timeline · People · Knowledge · Settings
│   │   ├── theme/        # Design tokens, styled-components theme
│   │   ├── utils/        # groupByMonth
│   │   ├── hooks/        # usePeople, useNotes, useWorkspaces, useKb,
│   │   │                 #   useAiSettings, useThemeMode, useHtmlPaste
│   │   └── components/
│   │       ├── atoms/    # Avatar, Badge, Button, Input, TextArea
│   │       ├── molecules/# NoteCard, MonthGroup, LoadMore, ModalShell,
│   │       │             #   PersonSelector, SentimentPicker, TimelineInsights
│   │       └── organisms/# Timeline, PeopleView (PersonFeed + PeopleManager),
│   │                     #   KnowledgeBase, Settings, WorkspaceSelector,
│   │                     #   AddNoteModal, NoteExpandedModal, ExportModal, ImportModal
│   └── quick-entry/      # Floating overlay window (global shortcut target)
└── shared/
    └── types.ts          # Shared TypeScript types and constants (incl. SyncSettings, Kb*)
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
| `workspace` | `onChanged(cb)` | Subscribe to workspace switches; returns an unsubscribe function |
| `notes` | `add(payload)` | Add a note |
| `notes` | `update(id, payload)` | Change a note's text, sentiment, or person |
| `notes` | `list(workspaceId, offset?, limit?)` | Return a page of notes for the workspace (default 100) |
| `notes` | `count(workspaceId, from?, to?)` | Count notes, optionally within a date range |
| `notes` | `countByPerson(workspaceId)` | Return `{ personId: count }` for the workspace |
| `notes` | `search(workspaceId, query)` | Full-text search over note content and person names |
| `notes` | `get(id)` | Return one note by ID, or `null` |
| `notes` | `listForPerson(personId, offset?, limit?)` | Return a page of one person's notes |
| `notes` | `listForPersonInRange(personId, from, to)` | Return one person's notes within a date range (used by summaries) |
| `notes` | `remove(id)` | Delete a note by ID |
| `notes` | `onUpdated(cb)` | Subscribe to note changes from any window; returns an unsubscribe function |
| `people` | `add(workspaceId, name)` | Add a person to a workspace |
| `people` | `list(workspaceId)` | Return active people in the given workspace |
| `people` | `listArchived(workspaceId)` | Return archived people in the given workspace |
| `people` | `rename(id, name)` | Rename a person |
| `people` | `archive(id)` | Soft-archive a person; hides them and their notes |
| `people` | `restore(id)` | Un-archive a person |
| `people` | `remove(id)` | Delete a person and cascade-delete their notes |
| `people` | `onUpdated(cb)` | Subscribe to roster changes; returns an unsubscribe function |
| `attachments` | `list(noteId)` | Return a note's attachments |
| `attachments` | `pick()` | Open an image picker, return selected paths or `null` |
| `attachments` | `add(noteId, sourcePath)` | Copy an image into the attachments folder and link it (max 5 per note) |
| `attachments` | `remove(id)` | Delete an attachment row and its file |
| `attachments` | `getPath(id)` | Return the on-disk path for rendering |
| `shortcut` | `get()` | Return the quick-entry accelerator |
| `shortcut` | `set(shortcut)` | Re-register the accelerator; returns `{ ok, error? }` |
| `export` | `run({ workspaceId, from?, to? })` | Build export payload for the given workspace, optionally filtered by date |
| `export` | `saveFile(json, filename)` | Open save dialog and write JSON to disk |
| `export` | `saveText(content, filename, filters)` | Open save dialog and write arbitrary text (used for markdown) |
| `import` | `openFile()` | Open file picker, return `{ content, name }` or `null` |
| `import` | `run(payload, workspaceId)` | Import notes into the given workspace, returns counts |
| `data` | `reset(workspaceId?)` | Delete all notes and people in the given workspace |
| `ai.settings` | `get()` | Return AI settings (enabled, apiKey, model, purposes, knowledge base options) |
| `ai.settings` | `set(patch)` | Update one or more AI settings fields |
| `ai.purposes` | `add(payload)` | Create a purpose preset |
| `ai.purposes` | `update(payload)` | Update a purpose preset |
| `ai.purposes` | `remove(id)` | Delete a purpose preset |
| `kb` | `status(workspaceId)` | Return topics, note counts, unfiled and stale counts, folder path |
| `kb` | `read(workspaceId, slug)` | Return one topic doc's body and metadata |
| `kb` | `fileUnfiled(workspaceId)` | File every not-yet-filed note into topics |
| `kb` | `regenerate(workspaceId, slug)` | Rewrite one topic doc from its notes |
| `kb` | `regenerateStale(workspaceId)` | Rewrite every topic whose body is behind its notes |
| `kb` | `rebuild(workspaceId)` | Discard all topics and re-file every note from scratch |
| `kb` | `ask(workspaceId, question)` | Answer a question from the topic docs; returns answer + sources |
| `kb` | `openFolder(workspaceId)` | Reveal the workspace's knowledge base folder in Finder |
| `kb` | `onUpdated(cb)` | Subscribe to knowledge base changes; returns an unsubscribe function |
| `sync` | `getSettings()` | Return GitHub sync configuration |
| `sync` | `setSettings(patch)` | Update one or more GitHub sync fields |
| `sync` | `push(workspaceId)` | Export active workspace and push to GitHub, mirroring knowledge base docs |
| `sync` | `pull(workspaceId)` | Fetch backup from GitHub and import into active workspace |
| `sync` | `onUpdated(cb)` | Subscribe to sync status changes; returns an unsubscribe function |
| `icloud` | `getSettings()` | Return iCloud sync state (`icloudEnabled`, last synced, last error) |
| `icloud` | `setSettings(patch)` | Enable or disable iCloud sync |
| `icloud` | `push(workspaceId)` | Write the workspace JSON and attachment files to iCloud Drive |
| `icloud` | `pull(workspaceId)` | Import the workspace JSON and attachment files from iCloud Drive |

## Data format

### Export / import schema

```jsonc
{
  "version": 2,
  "exportedAt": "2026-04-14T10:00:00.000Z",
  "from": null,          // ISO date string or null
  "to": null,
  "total": 42,
  "people": [
    {
      "id": "uuid",
      "workspaceId": "uuid",
      "name": "Alice Smith",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "archivedAt": null       // timestamp once archived; archived people are exported too
    }
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
  ],
  "attachments": [
    {
      "id": "uuid",
      "noteId": "uuid",
      "filename": "whiteboard.png",
      "mimeType": "image/png",
      "sizeBytes": 184320,
      "createdAt": "2026-04-12T14:31:00.000Z",
      "data": "iVBORw0KGgo…"    // base64; empty string when bytes are omitted
    }
  ]
}
```

`attachments[]` arrived with **v2**. The importer accepts v2, v1 (no attachments), and legacy notes-only files. Duplicate IDs are silently skipped via `INSERT OR IGNORE`. Both sync backends omit the base64 `data` — GitHub keeps metadata only, while iCloud copies the image files separately (see below).

### Knowledge base doc format

Each topic is one markdown file in `~/Library/Application Support/peernotes/kb/<workspaceId>/`, with app-managed frontmatter. `_index.md` lists every topic.

```markdown
---
topic: "Onboarding Friction"
slug: onboarding-friction
created_at: 2026-05-02T09:14:00.000Z
generated_at: 2026-08-14T11:02:00.000Z
note_ids: [uuid, uuid, uuid]
generated_note_ids: [uuid, uuid]
---
# Onboarding Friction

Two hires hit the same wall in their first week…

## What we know
- Local setup docs are stale ([Alice Smith · May 2](peernotes://note/uuid))
```

Folders are keyed by workspace **id**, not name, so renaming a workspace never orphans its docs. `note_ids` is everything filed under the topic; `generated_note_ids` is what the current body reflects — when they differ the doc is **stale** and the difference is the pending count shown in the UI. Bodies are full AI rewrites, so hand-edits are not preserved.

## GitHub Sync

Notes are backed up as a single JSON file in a GitHub repository using the [Contents API](https://docs.github.com/en/rest/repos/contents). The file uses the same schema as a manual export (see [Export / import schema](#export--import-schema)).

Given a **Backup Folder** of `peernotes` and a workspace named "Team Alpha", a push writes:

```
peernotes/team-alpha.json      # notes, people, attachment metadata
peernotes/team-alpha/kb/*.md   # knowledge base articles, readable on github.com
```

### Setup

1. Generate a GitHub Personal Access Token with `repo` scope (classic) or a fine-grained token with **Contents: Read and Write** on the target repository.
2. In Peernotes, open **Settings → GitHub Sync**.
3. Fill in your token, repository (`owner/repo`), branch, and backup folder.
4. Click **↑ Push** to create the initial backup, or **↓ Pull** to restore from an existing one.

### Known limitations

- **1 MB file size limit** — The GitHub Contents API cannot read or write files larger than 1 MB. A typical note is ~300–500 bytes of JSON; you would need roughly 2,000–3,000 notes in a single workspace to approach this limit. Options being considered for a future release: gzip compression (would push the effective limit to ~10,000+ notes) or splitting the backup into per-year files. For now, the app surfaces a clear error if a push or pull hits the limit.
- **Last-write-wins** — If two machines push concurrently, the later push overwrites the earlier one. GitHub retains the full commit history, so older snapshots are always recoverable via the repository's commit log.
- **Active workspace only** — Sync targets the currently selected workspace. Each workspace gets its own file and `kb/` folder inside the backup folder, named from the workspace slug.
- **No image bytes** — Attachment rows are pushed but their base64 `data` is stripped, so a GitHub pull restores notes and attachment metadata without the image files. Use iCloud sync (or a manual export) to move images between machines.

## iCloud Sync

An alternative to GitHub that needs no token and no repository: the active workspace is mirrored through a folder in your own iCloud Drive.

```
~/Library/Mobile Documents/com~apple~CloudDocs/Peernotes/
├── team-alpha.json     # one file per workspace
└── attachments/        # image files, copied as-is
```

Enable it under **Settings → iCloud Sync**, then use **↑ Push** / **↓ Pull** for manual runs. While enabled, Peernotes also:

- pushes the active workspace every **15 minutes**, and
- watches the folder and pulls **3 s** after another Mac writes that workspace's JSON (the debounce gives iCloud time to finish downloading the file).

Unlike GitHub sync, attachment images travel as real files rather than base64, so a second Mac gets the pictures. Knowledge base docs are not mirrored to iCloud: notes that arrive from another Mac land **unfiled** and are filed locally by the startup backfill or the **Sort unfiled** button in the Knowledge tab.

Both backends are last-write-wins, and both target only the active workspace. If iCloud Drive is unavailable on the machine, sync fails quietly and the last error is shown under the toggle.

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
  archived_at  TEXT,                                        -- NULL ⇒ active
  UNIQUE(workspace_id, name)
);

CREATE TABLE notes (
  id         TEXT PRIMARY KEY,
  person_id  TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  sentiment  TEXT NOT NULL CHECK(sentiment IN ('positive','neutral','negative')),
  note       TEXT NOT NULL,
  timestamp  TEXT NOT NULL
);

CREATE TABLE note_attachments (
  id         TEXT PRIMARY KEY,
  note_id    TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  filename   TEXT NOT NULL,
  mime_type  TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
  -- keys: quick_entry_shortcut
);

CREATE TABLE ai_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
  -- keys: enabled, api_key, model,
  --       kb_auto_file, kb_regen_threshold, kb_classifier_model
);

CREATE TABLE ai_purposes (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sync_settings (
  id                         INTEGER PRIMARY KEY CHECK (id = 1),
  github_token               TEXT,
  repo                       TEXT,                          -- "owner/repo"
  branch                     TEXT NOT NULL DEFAULT 'main',
  file_path                  TEXT NOT NULL DEFAULT 'peernotes',
  last_synced_at             INTEGER,                       -- Unix ms timestamp
  last_sync_error            TEXT,
  auto_sync_enabled          INTEGER NOT NULL DEFAULT 0,
  auto_sync_interval_minutes INTEGER NOT NULL DEFAULT 15,
  auto_sync_direction        TEXT NOT NULL DEFAULT 'both',  -- 'push' | 'pull' | 'both'
  icloud_enabled             INTEGER NOT NULL DEFAULT 0,
  icloud_last_synced_at      INTEGER,                       -- Unix ms timestamp
  icloud_last_sync_error     TEXT
);
```

The knowledge base has no tables — each topic is a markdown file whose frontmatter holds its state (see [Knowledge base doc format](#knowledge-base-doc-format)).

WAL mode is enabled. Foreign key enforcement is on. The schema is at `user_version = 11`; each migration is wrapped in a transaction so a mid-migration crash leaves the schema untouched and is safely re-attempted on next launch.

## AI Summaries

AI Summaries are powered by [OpenRouter](https://openrouter.ai), which gives you access to any model (Claude, GPT-4o, Mistral, Llama, etc.) with a single API key.

### Setup

1. Create an account at [openrouter.ai](https://openrouter.ai) and generate an API key.
2. In Peernotes, open **Settings → AI Summaries** and enable the toggle.
3. Paste your API key and enter the model string exactly as OpenRouter expects it (e.g. `anthropic/claude-3.5-sonnet`, `openai/gpt-4o`, `mistralai/mistral-7b-instruct`).
4. Create one or more **purpose presets** — each preset has a name and a system prompt that shapes how summaries are written.

### Generating a summary

1. Switch to the **People** tab and select a person.
2. Click **✦ Summarize** in the top-right of the feed.
3. Pick a date range and a purpose preset, then click **✦ Generate**.
4. The summary appears as a banner above the notes. You can **Dismiss** it, **Regenerate** with different settings, or **Save as note** to persist it as a neutral note with a `[AI Summary: …]` label.

### Example purpose presets

| Name | System prompt |
|------|---------------|
| Review Prep | You are a helpful assistant preparing bi-annual performance review notes. Given a list of observations about a team member, write a concise narrative summary that highlights key themes, strengths, and areas of growth. Be constructive and professional. |
| Retro Prep | You are summarizing sprint retrospective notes. Highlight standout contributions, shout-outs, and recurring positive patterns from the notes provided. Keep it brief and celebratory. |

## Knowledge base

The **Knowledge** tab turns the notes you have already written into a small wiki. It reuses the OpenRouter key and model from **Settings → AI Summaries** and does nothing until those are set.

### How a note becomes an article

1. **Filing** — When a note is saved, a classifier picks **at most two topics** for it, reusing an existing topic verbatim whenever one fits and inventing a new one only when none does. Topic names are 2–5 words and may never be a person's name, a date, or a sentiment. Filing is fire-and-forget: if it fails the note simply stays *unfiled* and is retried later, and the note save itself never errors.
2. **Writing** — A brand-new topic is written on its very first note, so it never sits in the sidebar empty; after that, its article is rewritten once it accumulates *N* unreflected notes. A rewrite produces a one-or-two-sentence summary, a `## What we know` section grouped by sub-theme, and `## Open questions` only when the notes genuinely leave something open. Every claim carries an inline `[Person · Mon D](peernotes://note/<id>)` citation, and clicking one opens that note in the app.
3. **Asking** — Type a question in the Knowledge tab. A local keyword pre-filter picks the **5** most relevant articles (capped at 6,000 characters each) so the prompt stays bounded as the base grows, then the model answers strictly from those, naming its sources.

Filing runs one note at a time through a queue, so a burst of saves cannot fan out into parallel API calls. Notes saved while offline or before AI was configured are caught up **5 s after launch**, up to **25 per launch**; anything beyond that stays visible as unfiled for the explicit Sort button.

### Settings

Under **Settings → Knowledge Base**:

| Setting | Default | Effect |
|---------|---------|--------|
| File notes automatically | on | Off ⇒ nothing is filed until you press **Sort unfiled** |
| Rewrite a topic after N new notes | `3` | `0` disables automatic rewrites; use **✦ Rewrite** by hand instead |
| Filing model (optional) | empty | A cheaper model for the per-note classifier; empty falls back to the main model |

### Actions in the tab

| Action | What it does |
|--------|--------------|
| **✦ Ask** | Answer a question from the articles, with source chips |
| **Sort N unfiled** | File every note that has no topic yet |
| **Rewrite N stale** | Rewrite every article that is behind its notes |
| **✦ Rewrite** | Rewrite the open article |
| **Rebuild…** | Discard all topics and re-file every note from scratch (confirmation required) |
| **Folder** | Reveal the workspace's `kb/` folder in Finder |

An article's body is a full AI rewrite each time, so hand-edits to the markdown are not preserved — the files are meant to be read and synced, not authored. Deleting a note removes it from its topics and marks those articles stale.

## License

MIT
