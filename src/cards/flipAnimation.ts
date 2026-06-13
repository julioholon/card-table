// src/cards/flipAnimation.ts
//
// Tracks in-flight flip animations for cards and decks.
// Each animation: 180° Y-axis rotation over 300ms.
// Uses cos(progress * PI) for scaleX to simulate rotation.
// At midpoint (scaleX crosses zero), the face flips.

export interface FlipAnim {
  readonly startTime: number
  readonly duration: number   // ms
  readonly targetFaceUp: boolean  // the face we're animating TO
}

// Map from object ID (deck id or card id) -> animation
let anims: Map<string, FlipAnim> = new Map()

/** Start a flip animation. If one is already running for this id, restart it. */
export function startFlip(id: string, targetFaceUp: boolean, duration = 300): void {
  anims.set(id, { startTime: performance.now(), duration, targetFaceUp })
}

/** Remove completed animations and return whether an animation is still active. */
export function getAnim(id: string): FlipAnim | null {
  const a = anims.get(id)
  if (!a) return null
  const elapsed = performance.now() - a.startTime
  if (elapsed >= a.duration) {
    anims.delete(id)
    return null
  }
  return a
}

/** Progress from 0→1 for the given animation id. Returns null if done. */
export function getProgress(id: string): number | null {
  const a = anims.get(id)
  if (!a) return null
  const elapsed = performance.now() - a.startTime
  if (elapsed >= a.duration) {
    anims.delete(id)
    return null
  }
  return elapsed / a.duration
}

/** Prune all completed anims (call once per frame). */
export function pruneCompleted(): void {
  const now = performance.now()
  for (const [id, a] of anims) {
    if (now - a.startTime >= a.duration) {
      anims.delete(id)
    }
  }
}

/** Whether any animation is currently running. */
export function hasActive(): boolean {
  if (anims.size === 0) return false
  const now = performance.now()
  for (const [, a] of anims) {
    if (now - a.startTime < a.duration) return true
  }
  // All stale — clean up
  anims.clear()
  return false
}
