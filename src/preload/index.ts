import { contextBridge, ipcRenderer } from 'electron'
import type { Person, Note, Sentiment, ImportPayload, ImportResult } from '@shared/types'

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
  }
})
