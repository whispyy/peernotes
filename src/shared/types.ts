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
  people?: Array<{ id: string; name: string; createdAt?: string }>
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
}
