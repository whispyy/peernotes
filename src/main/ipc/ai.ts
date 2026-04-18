import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { getDb } from '../store/db'
import type { AiSettings, AiPurposePreset } from '@shared/types'

export function registerAiHandlers(): void {
  ipcMain.handle('ai:settings:get', (): AiSettings => {
    const db = getDb()
    const rows = db.prepare('SELECT key, value FROM ai_settings').all() as { key: string; value: string }[]
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    const purposes = db
      .prepare('SELECT id, name, system_prompt as systemPrompt FROM ai_purposes ORDER BY sort_order')
      .all() as AiPurposePreset[]
    return {
      enabled: map.enabled === 'true',
      apiKey: map.api_key ?? '',
      model: map.model ?? '',
      purposes,
    }
  })

  ipcMain.handle(
    'ai:settings:set',
    (_e, patch: { enabled?: boolean; apiKey?: string; model?: string }): void => {
      const db = getDb()
      const upsert = db.prepare('INSERT OR REPLACE INTO ai_settings (key, value) VALUES (?, ?)')
      if (patch.enabled !== undefined) upsert.run('enabled', String(patch.enabled))
      if (patch.apiKey !== undefined) upsert.run('api_key', patch.apiKey)
      if (patch.model !== undefined) upsert.run('model', patch.model)
    }
  )

  ipcMain.handle(
    'ai:purposes:add',
    (_e, payload: { name: string; systemPrompt: string }): AiPurposePreset => {
      const db = getDb()
      const id = randomUUID()
      const row = db.prepare('SELECT MAX(sort_order) as m FROM ai_purposes').get() as { m: number | null }
      db.prepare('INSERT INTO ai_purposes (id, name, system_prompt, sort_order) VALUES (?, ?, ?, ?)').run(
        id,
        payload.name,
        payload.systemPrompt,
        (row.m ?? 0) + 1
      )
      return { id, name: payload.name, systemPrompt: payload.systemPrompt }
    }
  )

  ipcMain.handle(
    'ai:purposes:update',
    (_e, payload: { id: string; name: string; systemPrompt: string }): void => {
      const db = getDb()
      db.prepare('UPDATE ai_purposes SET name = ?, system_prompt = ? WHERE id = ?').run(
        payload.name,
        payload.systemPrompt,
        payload.id
      )
    }
  )

  ipcMain.handle('ai:purposes:remove', (_e, id: string): void => {
    getDb().prepare('DELETE FROM ai_purposes WHERE id = ?').run(id)
  })

  ipcMain.handle(
    'ai:summarize',
    async (
      _e,
      payload: {
        personName: string
        notes: Array<{ sentiment: string; note: string; timestamp: string }>
        from: string
        to: string
        systemPrompt: string
        apiKey: string
        model: string
      }
    ): Promise<{ text: string }> => {
      const { personName, notes, from, to, systemPrompt, apiKey, model } = payload

      const notesText = notes
        .map((n) => `[${new Date(n.timestamp).toLocaleDateString()} · ${n.sentiment}] ${n.note}`)
        .join('\n\n')

      const userContent = `Person: ${personName}\nDate range: ${from} to ${to}\n\nNotes:\n${notesText}`

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://peernotes.app',
          'X-Title': 'Peernotes',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        }),
      })

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
        throw new Error(errorData?.error?.message ?? `OpenRouter error: ${response.status}`)
      }

      const data = (await response.json()) as { choices: Array<{ message: { content: string } }> }
      return { text: data.choices[0]?.message?.content ?? '' }
    }
  )
}
