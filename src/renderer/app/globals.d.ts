import type { Person, Note, Sentiment, ExportResult, ImportPayload, ImportResult, AiSettings, AiPurposePreset } from '@shared/types'

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
        summarize: (payload: {
          personName: string
          notes: Array<{ sentiment: string; note: string; timestamp: string }>
          from: string
          to: string
          systemPrompt: string
          apiKey: string
          model: string
        }) => Promise<{ text: string }>
      }
    }
  }
}

export {}
