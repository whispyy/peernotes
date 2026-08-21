export type Sentiment = 'positive' | 'neutral' | 'negative'
export const VALID_SENTIMENTS: Sentiment[] = ['positive', 'neutral', 'negative']
export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative'
}

export interface Workspace {
  id: string
  name: string
  createdAt: string
}

export interface Person {
  id: string
  workspaceId: string
  name: string
  createdAt: string
  /** ISO timestamp when archived; null/undefined when active. */
  archivedAt?: string | null
}

export interface Note {
  id: string
  personId: string
  sentiment: Sentiment
  note: string
  timestamp: string
}

export const NOTE_MAX_LENGTH = 10_000
export const MAX_ATTACHMENTS_PER_NOTE = 5

// ── Export format ─────────────────────────────────────────────────────────────

export interface ExportNote {
  id: string
  personId: string
  person: string   // resolved display name — kept for human readability
  sentiment: string
  note: string
  timestamp: string
}

export interface ExportResult {
  version: 1
  exportedAt: string
  from: string | null
  to: string | null
  total: number
  people: Person[]
  notes: ExportNote[]
}

// ── Attachments ───────────────────────────────────────────────────────────────

export interface Attachment {
  id: string
  noteId: string
  filename: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export interface ExportAttachment extends Attachment {
  data: string  // base64-encoded file content; empty string when not included
}

export interface ExportResultV2 {
  version: 2
  exportedAt: string
  from: string | null
  to: string | null
  total: number
  people: Person[]
  notes: ExportNote[]
  attachments: ExportAttachment[]
}

export type AnyExportResult = ExportResult | ExportResultV2

// ── Import format ─────────────────────────────────────────────────────────────

/** Accepts both v1 (with people[]) and legacy (notes-only) export files */
export interface ImportPayload {
  version?: number
  people?: Array<{ id: string; name: string; createdAt?: string; archivedAt?: string | null }>
  notes: Array<{
    id?: string
    personId?: string
    person: string   // name — required in both formats
    sentiment: string
    note: string
    timestamp: string
  }>
  attachments?: Array<Pick<Attachment, 'id' | 'noteId' | 'filename' | 'mimeType' | 'sizeBytes' | 'createdAt'> & { data?: string }>
}

export interface ImportResult {
  imported: number
  skipped: number
  peopleCreated: number
}

// ── GitHub Sync ───────────────────────────────────────────────────────────────

export type SyncDirection = 'push' | 'pull' | 'both'

export interface SyncSettings {
  githubToken: string | null
  githubTokenSet: boolean
  repo: string | null
  branch: string
  filePath: string
  lastSyncedAt: number | null
  lastSyncError: string | null
  autoSyncEnabled: boolean
  autoSyncIntervalMinutes: number
  autoSyncDirection: SyncDirection
}

// ── iCloud Sync ───────────────────────────────────────────────────────────────

export interface ICloudSyncSettings {
  icloudEnabled: boolean
  lastSyncedAt: number | null
  lastSyncError: string | null
}

// ── AI Summary ────────────────────────────────────────────────────────────────

export interface AiPurposePreset {
  id: string
  name: string
  systemPrompt: string
}

export interface AiSettings {
  enabled: boolean
  apiKey: string
  model: string
  purposes: AiPurposePreset[]
  /** file each new note into knowledge base topics as it is saved */
  kbAutoFile: boolean
  /** unreflected notes needed before a topic doc rewrites itself; 0 disables */
  kbRegenThreshold: number
  /** cheaper model for per-note filing; empty falls back to `model` */
  kbClassifierModel: string
}

/** Outcome of checking the saved OpenRouter key against the provider. */
export interface AiVerifyResult {
  ok: boolean
  /** key name as OpenRouter reports it */
  label?: string
  /** credits spent on the key */
  usage?: number
  /** credit ceiling; null when the key is uncapped */
  limit?: number | null
  /** why it failed, ready to show as-is */
  error?: string
}

// ── Knowledge base ────────────────────────────────────────────────────────────

export interface KbTopic {
  slug: string
  topic: string
  noteCount: number
  /** notes filed under the topic that its body doesn't reflect yet */
  pendingCount: number
  generatedAt: string | null
  stale: boolean
}

export interface KbStatus {
  topics: KbTopic[]
  /** live notes in the workspace — what a rebuild would re-file */
  noteCount: number
  unfiledCount: number
  staleCount: number
  folder: string
}

export interface KbDocContent {
  slug: string
  topic: string
  body: string
  noteIds: string[]
  generatedAt: string | null
  stale: boolean
  pendingCount: number
}

export interface KbAskResult {
  answer: string
  sources: Array<{ slug: string; topic: string }>
}

export interface KbFileResult {
  filed: number
  failed: number
}

export interface KbRebuildResult {
  notes: number
  filed: number
  failed: number
  topics: number
  regenerated: number
  regenFailed: Array<{ slug: string; error: string }>
}

export interface KbRegenerateResult {
  regenerated: number
  failed: Array<{ slug: string; error: string }>
}
