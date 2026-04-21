import type { Person, Note, Sentiment, ExportResult, ImportPayload, ImportResult, AiSettings, AiPurposePreset, Workspace } from '@shared/types'

declare global {
  interface Window {
    api: {
      data: {
        reset: (workspaceId: string) => Promise<void>
      }
      export: {
        run: (payload: { workspaceId: string; from?: string; to?: string }) => Promise<ExportResult>
        saveFile: (content: string, filename: string) => Promise<boolean>
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
      }
      notes: {
        list: (workspaceId: string) => Promise<Note[]>
        add: (payload: { personId: string; sentiment: Sentiment; note: string }) => Promise<Note>
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
