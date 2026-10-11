/** Fisher–Yates draw of `count` distinct items. Call from event handlers, not render. */
export function pickRandom<T>(bank: readonly T[], count: number, rng: () => number = Math.random): T[] {
  const pool = [...bank];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
