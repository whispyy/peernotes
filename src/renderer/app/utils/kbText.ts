import type { KbProgress, KbRebuildResult } from '@shared/types'

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function formatKbProgress({ phase, done, total }: KbProgress): string {
  return phase === 'filing' ? `Sorting note ${done} of ${total}…` : `Writing document ${done} of ${total}…`
}

/**
 * One line covering what a rebuild managed, including the ways it falls short.
 * Rebuild is triggered from Settings, so anything left over points back at the
 * Knowledge tab where the recovery action lives.
 */
export function describeRebuild(r: KbRebuildResult): string {
  const parts = [`Rebuilt ${plural(r.topics, 'topic')} from ${r.filed} of ${plural(r.notes, 'note')}`]
  if (r.failed > 0) parts.push(`${r.failed} could not be filed`)
  // Either the user stopped it or the filing guard tripped after three
  // consecutive failures — say so rather than leaving notes unexplained.
  if (r.filed + r.failed < r.notes) {
    const left = r.notes - r.filed
    parts.push(
      r.cancelled
        ? `stopped — ${left} still unfiled, sort them from the Knowledge tab`
        : `stopped early — ${left} still unfiled, sort them from the Knowledge tab once the cause is fixed`
    )
  }
  if (r.regenFailed.length > 0) parts.push(`${plural(r.regenFailed.length, 'document')} failed to write`)
  return `${parts.join(' · ')}.`
}
