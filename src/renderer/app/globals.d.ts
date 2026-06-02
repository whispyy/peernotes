import type { Person, Note, Sentiment, ExportResultV2, ImportPayload, ImportResult, AiSettings, AiPurposePreset, Workspace, SyncSettings, ICloudSyncSettings, Attachment } from '@shared/types'

declare global {
  interface Window {
    api: {
      data: {
        reset: (workspaceId: string) => Promise<void>
      }
      export: {
        run: (payload: { workspaceId: string; from?: string; to?: string }) => Promise<ExportResultV2>
        saveFile: (content: string, filename: string) => Promise<boolean>
        saveText: (content: string, filename: string, filters: { name: string; extensions: string[] }[]) => Promise<boolean>
      }
      attachments: {
        list: (noteId: string) => Promise<Attachment[]>
        pick: () => Promise<string[] | null>
        add: (noteId: string, sourcePath: string) => Promise<Attachment>
        remove: (id: string) => Promise<void>
        getPath: (id: string) => Promise<string | null>
      }
      import: {
        openFile: () => Promise<{ content: string; name: string } | null>
        run: (payload: ImportPayload, workspaceId: string) => Promise<ImportResult>
      }
      people: {
        list: (workspaceId: string) => Promise<Person[]>
        add: (workspaceId: string, name: string) => Promise<Person>
        rename: (id: string, name: string) => Promise<void>
        remove: (id: string) => Promise<void>
        onUpdated: (cb: () => void) => (() => void)
      }
      notes: {
        list: (workspaceId: string, offset?: number, limit?: number) => Promise<Note[]>
        count: (workspaceId: string, from?: string, to?: string) => Promise<number>
        search: (workspaceId: string, query: string) => Promise<Note[]>
        countByPerson: (workspaceId: string) => Promise<Record<string, number>>
        listForPerson: (personId: string, offset?: number, limit?: number) => Promise<Note[]>
        listForPersonInRange: (personId: string, from: string, to: string) => Promise<Note[]>
        add: (payload: { personId: string; sentiment: Sentiment; note: string }) => Promise<Note>
        update: (id: string, payload: { sentiment: Sentiment; note: string }) => Promise<Note>
        remove: (id: string) => Promise<void>
        onUpdated: (cb: () => void) => (() => void)
      }
      workspace: {
        list: () => Promise<Workspace[]>
        add: (name: string) => Promise<Workspace>
        rename: (id: string, name: string) => Promise<void>
        remove: (id: string) => Promise<void>
        getActive: () => Promise<string | null>
        setActive: (id: string) => Promise<void>
        onChanged: (cb: () => void) => (() => void)
      }
      sync: {
        getSettings: () => Promise<SyncSettings>
        setSettings: (patch: Partial<SyncSettings>) => Promise<void>
        push: (workspaceId: string) => Promise<{ total: number }>
        pull: (workspaceId: string) => Promise<{ imported: number; skipped: number }>
        onUpdated: (cb: () => void) => (() => void)
      }
      icloud: {
        getSettings: () => Promise<ICloudSyncSettings>
        setSettings: (patch: Partial<ICloudSyncSettings>) => Promise<void>
        push: (workspaceId: string) => Promise<{ total: number }>
        pull: (workspaceId: string) => Promise<{ imported: number; skipped: number }>
      }
      shortcut: {
        get: () => Promise<string>
        set: (shortcut: string) => Promise<{ ok: boolean; error?: string }>
      }
      ai: {
        settings: {
          get: () => Promise<AiSettings>
          set: (patch: { enabled?: boolean; apiKey?: string; model?: string }) => Promise<void>
        }
        purposes: {
          add: (payload: { name: string; systemPrompt: string }) => Promise<AiPurposePreset>
          update: (payload: { id: string; name: string; systemPrompt: string }) => Promise<void>
          remove: (id: string) => Promise<void>
        }
      }
    }
  }
}

export {}
