import type { Note } from '@shared/types'

export function groupByMonth(notes: Note[]): Array<{ label: string; notes: Note[] }> {
  const map = new Map<string, Note[]>()
  for (const note of notes) {
    const label = new Date(note.timestamp).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(note)
  }
  return Array.from(map.entries()).map(([label, notes]) => ({ label, notes }))
}
