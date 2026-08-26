/**
 * Cooperative stop for the long runs — sorting a backlog or rebuilding is one
 * AI call per note, so the user needs a way out that doesn't mean quitting the
 * app. A single flag is enough because every KB operation is serialized through
 * the filing chain, so only one long run can be in flight.
 */
let cancelled = false

/** Called at the start of a long run, so a stale cancel can't kill the next one. */
export function resetCancel(): void {
  cancelled = false
}

export function requestCancel(): void {
  cancelled = true
}

/** Checked once per note or document — never mid-request. */
export function isCancelled(): boolean {
  return cancelled
}
