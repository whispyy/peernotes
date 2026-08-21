import { net } from 'electron'
import { getDb } from '../store/db'
import type { AiVerifyResult } from '@shared/types'

export interface KbAiConfig {
  enabled: boolean
  apiKey: string
  /** model used for doc generation and Ask */
  model: string
  /** cheaper model used for per-note filing; falls back to `model` */
  classifierModel: string
  autoFile: boolean
  /** unreflected notes needed before a doc auto-regenerates; 0 disables */
  regenThreshold: number
}

export function readKbAiConfig(): KbAiConfig {
  const rows = getDb().prepare('SELECT key, value FROM ai_settings').all() as Array<{ key: string; value: string }>
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  const model = map.model ?? ''
  const threshold = Number.parseInt(map.kb_regen_threshold ?? '3', 10)
  return {
    enabled: map.enabled === 'true',
    apiKey: map.api_key ?? '',
    model,
    classifierModel: map.kb_classifier_model || model,
    autoFile: (map.kb_auto_file ?? 'true') === 'true',
    regenThreshold: Number.isFinite(threshold) ? threshold : 3,
  }
}

/** True when a call can actually be made — callers stay silent otherwise. */
export function isKbAiReady(config: KbAiConfig): boolean {
  return config.enabled && !!config.apiKey && !!config.model
}

/**
 * Checks a key against OpenRouter's own key endpoint, which costs nothing and
 * needs no model. Every failure comes back as a result rather than a throw so
 * the settings row can render it verbatim.
 */
export async function verifyApiKey(apiKey: string): Promise<AiVerifyResult> {
  if (!apiKey) return { ok: false, error: 'No API key saved yet.' }

  try {
    const response = await net.fetch('https://openrouter.ai/api/v1/key', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://peernotes.app',
        'X-Title': 'Peernotes',
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: 'OpenRouter rejected this key.' }
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
      return { ok: false, error: body?.error?.message ?? `OpenRouter error: ${response.status}` }
    }

    // Shape is { data: { label, usage, limit, … } }; treat every field as optional
    // so a change on their side downgrades the message instead of breaking it.
    const body = (await response.json().catch(() => ({}))) as {
      data?: { label?: unknown; usage?: unknown; limit?: unknown }
    }
    const data = body?.data ?? {}
    return {
      ok: true,
      label: typeof data.label === 'string' && data.label ? data.label : undefined,
      usage: typeof data.usage === 'number' ? data.usage : undefined,
      limit: typeof data.limit === 'number' ? data.limit : null,
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      return { ok: false, error: 'OpenRouter did not respond in time.' }
    }
    return { ok: false, error: 'Could not reach OpenRouter.' }
  }
}

interface ChatParams {
  config: KbAiConfig
  model: string
  system: string
  user: string
  timeoutMs?: number
}

export async function chat({ config, model, system, user, timeoutMs = 90_000 }: ChatParams): Promise<string> {
  const response = await net.fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      'HTTP-Referer': 'https://peernotes.app',
      'X-Title': 'Peernotes',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(errorData?.error?.message ?? `OpenRouter error: ${response.status}`)
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenRouter returned an empty response')
  return content
}

/** Models like to wrap JSON in prose or code fences — pull the object back out. */
export function parseJsonObject(raw: string): Record<string, unknown> | null {
  const stripped = raw.replace(/```(?:json)?/gi, '').trim()
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    const parsed = JSON.parse(stripped.slice(start, end + 1)) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}
