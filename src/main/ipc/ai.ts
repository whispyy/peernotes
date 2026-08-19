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
    const threshold = Number.parseInt(map.kb_regen_threshold ?? '3', 10)
    return {
      enabled: map.enabled === 'true',
      apiKey: map.api_key ?? '',
      model: map.model ?? '',
      purposes,
      kbAutoFile: (map.kb_auto_file ?? 'true') === 'true',
      kbRegenThreshold: Number.isFinite(threshold) ? threshold : 3,
      kbClassifierModel: map.kb_classifier_model ?? '',
    }
  })

  ipcMain.handle(
    'ai:settings:set',
    (
      _e,
      patch: {
        enabled?: boolean
        apiKey?: string
        model?: string
        kbAutoFile?: boolean
        kbRegenThreshold?: number
        kbClassifierModel?: string
      }
    ): void => {
      const db = getDb()
      const upsert = db.prepare('INSERT OR REPLACE INTO ai_settings (key, value) VALUES (?, ?)')
      if (patch.enabled !== undefined) upsert.run('enabled', String(patch.enabled))
      if (patch.apiKey !== undefined) upsert.run('api_key', patch.apiKey)
      if (patch.model !== undefined) upsert.run('model', patch.model)
      if (patch.kbAutoFile !== undefined) upsert.run('kb_auto_file', String(patch.kbAutoFile))
      if (patch.kbRegenThreshold !== undefined) {
        upsert.run('kb_regen_threshold', String(Math.max(0, Math.trunc(patch.kbRegenThreshold))))
      }
      if (patch.kbClassifierModel !== undefined) upsert.run('kb_classifier_model', patch.kbClassifierModel)
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

}
