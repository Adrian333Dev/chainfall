/**
 * Deterministic PRNG (mulberry32). Same seed => same sequence. No Math.random, no Date.
 * Seed is normalized to uint32 (seed >>> 0).
 */
export function createRng(seed: number) {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0; // mulberry32
    const t = Math.imul(state ^ (state >>> 15), 1 | state);
    return ((t + (t ^ (t >>> 7))) >>> 0) / 0x1_0000_0000;
  }

  function nextInt(maxExclusive: number): number {
    return Math.floor(next() * maxExclusive);
  }

  return { next, nextInt };
}
