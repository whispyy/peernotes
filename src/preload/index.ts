import { contextBridge, ipcRenderer } from 'electron'
import type { Person, Note, Sentiment, ImportPayload, ImportResult, AiSettings, AiPurposePreset, Workspace, SyncSettings } from '@shared/types'

contextBridge.exposeInMainWorld('api', {
  data: {
    reset: (workspaceId: string): Promise<void> => ipcRenderer.invoke('settings:reset', workspaceId)
  },
  export: {
    run: (payload: { workspaceId: string; from?: string; to?: string }) =>
      ipcRenderer.invoke('notes:export', payload),
    saveFile: (content: string, filename: string) =>
      ipcRenderer.invoke('export:saveFile', { content, filename })
  },
  import: {
    openFile: (): Promise<{ content: string; name: string } | null> =>
      ipcRenderer.invoke('import:openFile'),
    run: (payload: ImportPayload, workspaceId: string): Promise<ImportResult> =>
      ipcRenderer.invoke('notes:import', payload, workspaceId)
  },
  people: {
    list: (workspaceId: string): Promise<Person[]> => ipcRenderer.invoke('people:list', workspaceId),
    add: (workspaceId: string, name: string): Promise<Person> =>
      ipcRenderer.invoke('people:add', workspaceId, name),
    rename: (id: string, name: string): Promise<void> => ipcRenderer.invoke('people:rename', id, name),
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
    listForPerson: (personId: string, offset = 0, limit = 100): Promise<Note[]> =>
      ipcRenderer.invoke('notes:list-for-person', personId, offset, limit),
    listForPersonInRange: (personId: string, from: string, to: string): Promise<Note[]> =>
      ipcRenderer.invoke('notes:list-for-person-in-range', personId, from, to),
    add: (payload: { personId: string; sentiment: Sentiment; note: string }): Promise<Note> =>
      ipcRenderer.invoke('notes:add', payload),
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
  ai: {
    settings: {
      get: (): Promise<AiSettings> => ipcRenderer.invoke('ai:settings:get'),
      set: (patch: { enabled?: boolean; apiKey?: string; model?: string }): Promise<void> =>
        ipcRenderer.invoke('ai:settings:set', patch),
    },
    purposes: {
      add: (payload: { name: string; systemPrompt: string }): Promise<AiPurposePreset> =>
        ipcRenderer.invoke('ai:purposes:add', payload),
      update: (payload: { id: string; name: string; systemPrompt: string }): Promise<void> =>
        ipcRenderer.invoke('ai:purposes:update', payload),
      remove: (id: string): Promise<void> => ipcRenderer.invoke('ai:purposes:remove', id),
    },
    summarize: (payload: {
      personName: string
      notes: Array<{ sentiment: string; note: string; timestamp: string }>
      from: string
      to: string
      systemPrompt: string
      apiKey: string
      model: string
    }): Promise<{ text: string }> => ipcRenderer.invoke('ai:summarize', payload),
  }
})
