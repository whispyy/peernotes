import { contextBridge, ipcRenderer } from 'electron'
import type { Person, Note, Sentiment, ImportPayload, ImportResult, AiSettings, AiPurposePreset } from '@shared/types'

contextBridge.exposeInMainWorld('api', {
  data: {
    reset: (): Promise<void> => ipcRenderer.invoke('settings:reset')
  },
  export: {
    run: (payload: { from?: string; to?: string }) => ipcRenderer.invoke('notes:export', payload),
    saveFile: (content: string, filename: string) =>
      ipcRenderer.invoke('export:saveFile', { content, filename })
  },
  import: {
    openFile: (): Promise<{ content: string; name: string } | null> =>
      ipcRenderer.invoke('import:openFile'),
    run: (payload: ImportPayload): Promise<ImportResult> => ipcRenderer.invoke('notes:import', payload)
  },
  people: {
    list: (): Promise<Person[]> => ipcRenderer.invoke('people:list'),
    add: (name: string): Promise<Person> => ipcRenderer.invoke('people:add', name),
    rename: (id: string, name: string): Promise<void> => ipcRenderer.invoke('people:rename', id, name),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('people:remove', id)
  },
  notes: {
    list: (): Promise<Note[]> => ipcRenderer.invoke('notes:list'),
    add: (payload: { personId: string; sentiment: Sentiment; note: string }): Promise<Note> =>
      ipcRenderer.invoke('notes:add', payload),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('notes:remove', id),
    onUpdated: (cb: () => void): (() => void) => {
      ipcRenderer.on('notes:updated', cb)
      return () => ipcRenderer.removeListener('notes:updated', cb)
    }
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
