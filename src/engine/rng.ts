/**
 * Seeded PRNG (mulberry32). Every random decision in the game flows through
 * here so a fixed seed replays an identical game — the property future
 * room-based multiplayer relies on.
 *
 * All functions are pure: they return [value, nextSeed] and never mutate.
 */

/** Advance the seed and produce a float in [0, 1). */
function step(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Random integer in [0, maxExclusive). */
export function nextInt(seed: number, maxExclusive: number): [number, number] {
  const [value, next] = step(seed);
  return [Math.floor(value * maxExclusive), next];
}

/** A standard six-sided die: 1..6. */
export function rollDie(seed: number): [number, number] {
  const [value, next] = nextInt(seed, 6);
  return [value + 1, next];
}

/** Percentage roll for chance-based config like "roll off the table". */
export function rollPercent(seed: number): [number, number] {
  return nextInt(seed, 100);
}
