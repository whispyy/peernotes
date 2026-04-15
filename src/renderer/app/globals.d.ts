import type { Person, Note, Sentiment, ExportResult, ImportPayload, ImportResult } from '@shared/types'

declare global {
  interface Window {
    api: {
      data: {
        reset: () => Promise<void>
      }
      export: {
        run: (payload: { from?: string; to?: string }) => Promise<ExportResult>
        saveFile: (content: string, filename: string) => Promise<boolean>
      }
      import: {
        openFile: () => Promise<{ content: string; name: string } | null>
        run: (payload: ImportPayload) => Promise<ImportResult>
      }
      people: {
        list: () => Promise<Person[]>
        add: (name: string) => Promise<Person>
        rename: (id: string, name: string) => Promise<void>
        remove: (id: string) => Promise<void>
      }
      notes: {
        list: () => Promise<Note[]>
        add: (payload: { personId: string; sentiment: Sentiment; note: string }) => Promise<Note>
        remove: (id: string) => Promise<void>
        onUpdated: (cb: () => void) => (() => void)
      }
    }
  }
}

export {}
