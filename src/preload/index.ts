import { contextBridge, ipcRenderer } from 'electron'
import type { Person, Note, Sentiment, ImportPayload, ImportResult, AiSettings, AiPurposePreset, AiVerifyResult, Workspace, SyncSettings, ICloudSyncSettings, Attachment, KbStatus, KbDocContent, KbAskResult, KbAskTurn, KbFileResult, KbRegenerateResult, KbRebuildResult, KbProgress } from '@shared/types'

contextBridge.exposeInMainWorld('api', {
  data: {
    reset: (workspaceId: string): Promise<void> => ipcRenderer.invoke('settings:reset', workspaceId)
  },
  export: {
    run: (payload: { workspaceId: string; from?: string; to?: string }) =>
      ipcRenderer.invoke('notes:export', payload),
    saveFile: (content: string, filename: string) =>
      ipcRenderer.invoke('export:saveFile', { content, filename }),
    saveText: (content: string, filename: string, filters: { name: string; extensions: string[] }[]) =>
      ipcRenderer.invoke('export:saveText', { content, filename, filters }),
  },
  import: {
    openFile: (): Promise<{ content: string; name: string } | null> =>
      ipcRenderer.invoke('import:openFile'),
    run: (payload: ImportPayload, workspaceId: string): Promise<ImportResult> =>
      ipcRenderer.invoke('notes:import', payload, workspaceId)
  },
  people: {
    list: (workspaceId: string): Promise<Person[]> => ipcRenderer.invoke('people:list', workspaceId),
    listArchived: (workspaceId: string): Promise<Person[]> =>
      ipcRenderer.invoke('people:list-archived', workspaceId),
    add: (workspaceId: string, name: string): Promise<Person> =>
      ipcRenderer.invoke('people:add', workspaceId, name),
    rename: (id: string, name: string): Promise<void> => ipcRenderer.invoke('people:rename', id, name),
    archive: (id: string): Promise<void> => ipcRenderer.invoke('people:archive', id),
    restore: (id: string): Promise<void> => ipcRenderer.invoke('people:restore', id),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('people:remove', id),
    onUpdated: (cb: () => void): (() => void) => {
      ipcRenderer.on('people:updated', cb)
      return () => ipcRenderer.removeListener('people:updated', cb)
    }
  },
  notes: {
    list: (workspaceId: string, offset = 0, limit = 100): Promise<Note[]> =>
      ipcRenderer.invoke('notes:list', workspaceId, offset, limit),
    count: (workspaceId: string, from?: string, to?: string): Promise<number> =>
      ipcRenderer.invoke('notes:count', workspaceId, from, to),
    search: (workspaceId: string, query: string): Promise<Note[]> =>
      ipcRenderer.invoke('notes:search', workspaceId, query),
    countByPerson: (workspaceId: string): Promise<Record<string, number>> =>
      ipcRenderer.invoke('notes:count-by-person', workspaceId),
    get: (id: string): Promise<Note | null> => ipcRenderer.invoke('notes:get', id),
    listForPerson: (personId: string, offset = 0, limit = 100): Promise<Note[]> =>
      ipcRenderer.invoke('notes:list-for-person', personId, offset, limit),
    listForPersonInRange: (personId: string, from: string, to: string): Promise<Note[]> =>
      ipcRenderer.invoke('notes:list-for-person-in-range', personId, from, to),
    add: (payload: { personId: string; sentiment: Sentiment; note: string }): Promise<Note> =>
      ipcRenderer.invoke('notes:add', payload),
    update: (id: string, payload: { sentiment: Sentiment; note: string; personId?: string }): Promise<Note> =>
      ipcRenderer.invoke('notes:update', id, payload),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('notes:remove', id),
    onUpdated: (cb: () => void): (() => void) => {
      ipcRenderer.on('notes:updated', cb)
      return () => ipcRenderer.removeListener('notes:updated', cb)
    }
  },
  workspace: {
    list: (): Promise<Workspace[]> => ipcRenderer.invoke('workspace:list'),
    add: (name: string): Promise<Workspace> => ipcRenderer.invoke('workspace:add', name),
    rename: (id: string, name: string): Promise<void> => ipcRenderer.invoke('workspace:rename', id, name),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('workspace:remove', id),
    getActive: (): Promise<string | null> => ipcRenderer.invoke('workspace:getActive'),
    setActive: (id: string): Promise<void> => ipcRenderer.invoke('workspace:setActive', id),
    onChanged: (cb: () => void): (() => void) => {
      ipcRenderer.on('workspace:changed', cb)
      return () => ipcRenderer.removeListener('workspace:changed', cb)
    }
  },
  sync: {
    getSettings: (): Promise<SyncSettings> => ipcRenderer.invoke('sync:settings:get'),
    setSettings: (patch: Partial<SyncSettings>): Promise<void> =>
      ipcRenderer.invoke('sync:settings:set', patch),
    push: (workspaceId: string): Promise<{ total: number }> =>
      ipcRenderer.invoke('sync:push', workspaceId),
    pull: (workspaceId: string): Promise<{ imported: number; skipped: number }> =>
      ipcRenderer.invoke('sync:pull', workspaceId),
    onUpdated: (cb: () => void): (() => void) => {
      ipcRenderer.on('sync:updated', cb)
      return () => ipcRenderer.removeListener('sync:updated', cb)
    },
  },
  icloud: {
    getSettings: (): Promise<ICloudSyncSettings> => ipcRenderer.invoke('icloud:settings:get'),
    setSettings: (patch: Partial<ICloudSyncSettings>): Promise<void> =>
      ipcRenderer.invoke('icloud:settings:set', patch),
    push: (workspaceId: string): Promise<{ total: number }> =>
      ipcRenderer.invoke('icloud:push', workspaceId),
    pull: (workspaceId: string): Promise<{ imported: number; skipped: number }> =>
      ipcRenderer.invoke('icloud:pull', workspaceId),
  },
  attachments: {
    list: (noteId: string): Promise<Attachment[]> =>
      ipcRenderer.invoke('attachments:list', noteId),
    pick: (): Promise<string[] | null> =>
      ipcRenderer.invoke('attachments:pick'),
    add: (noteId: string, sourcePath: string): Promise<Attachment> =>
      ipcRenderer.invoke('attachments:add', noteId, sourcePath),
    remove: (id: string): Promise<void> =>
      ipcRenderer.invoke('attachments:remove', id),
    getPath: (id: string): Promise<string | null> =>
      ipcRenderer.invoke('attachments:getPath', id),
  },
  shortcut: {
    get: (): Promise<string> => ipcRenderer.invoke('shortcut:get'),
    set: (shortcut: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('shortcut:set', shortcut),
  },
  kb: {
    status: (workspaceId: string): Promise<KbStatus> => ipcRenderer.invoke('kb:status', workspaceId),
    read: (workspaceId: string, slug: string): Promise<KbDocContent | null> =>
      ipcRenderer.invoke('kb:read', workspaceId, slug),
    fileUnfiled: (workspaceId: string): Promise<KbFileResult> =>
      ipcRenderer.invoke('kb:file-unfiled', workspaceId),
    regenerate: (workspaceId: string, slug: string): Promise<void> =>
      ipcRenderer.invoke('kb:regenerate', workspaceId, slug),
    regenerateStale: (workspaceId: string): Promise<KbRegenerateResult> =>
      ipcRenderer.invoke('kb:regenerate-stale', workspaceId),
    rebuild: (workspaceId: string): Promise<KbRebuildResult> =>
      ipcRenderer.invoke('kb:rebuild', workspaceId),
    ask: (workspaceId: string, question: string, history: KbAskTurn[] = []): Promise<KbAskResult> =>
      ipcRenderer.invoke('kb:ask', workspaceId, question, history),
    cancel: (): Promise<void> => ipcRenderer.invoke('kb:cancel'),
    openFolder: (workspaceId: string): Promise<void> =>
      ipcRenderer.invoke('kb:open-folder', workspaceId),
    onUpdated: (cb: () => void): (() => void) => {
      ipcRenderer.on('kb:updated', cb)
      return () => ipcRenderer.removeListener('kb:updated', cb)
    },
    onProgress: (cb: (progress: KbProgress) => void): (() => void) => {
      const handler = (_e: unknown, progress: KbProgress): void => cb(progress)
      ipcRenderer.on('kb:progress', handler)
      return () => ipcRenderer.removeListener('kb:progress', handler)
    },
  },
  ai: {
    verify: (): Promise<AiVerifyResult> => ipcRenderer.invoke('ai:verify'),
    settings: {
      get: (): Promise<AiSettings> => ipcRenderer.invoke('ai:settings:get'),
      set: (patch: {
        enabled?: boolean
        apiKey?: string
        model?: string
        kbAutoFile?: boolean
        kbRegenThreshold?: number
        kbClassifierModel?: string
      }): Promise<void> => ipcRenderer.invoke('ai:settings:set', patch),
    },
    purposes: {
      add: (payload: { name: string; systemPrompt: string }): Promise<AiPurposePreset> =>
        ipcRenderer.invoke('ai:purposes:add', payload),
      update: (payload: { id: string; name: string; systemPrompt: string }): Promise<void> =>
        ipcRenderer.invoke('ai:purposes:update', payload),
      remove: (id: string): Promise<void> => ipcRenderer.invoke('ai:purposes:remove', id),
    },
  }
})
