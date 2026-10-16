/** Fisher–Yates draw of `count` distinct items. Call from event handlers, not render. */
export function pickRandom<T>(bank: readonly T[], count: number, rng: () => number = Math.random): T[] {
  const pool = [...bank];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

/** The same question with its four options in a random order and `correctIndex` following the right answer. */
export function shuffleOptions<Q extends { options: [string, string, string, string]; correctIndex: 0 | 1 | 2 | 3 }>(q: Q, rng: () => number = Math.random): Q {
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...q,
    options: order.map((i) => q.options[i]) as Q['options'],
    correctIndex: order.indexOf(q.correctIndex) as Q['correctIndex'],
  };
}
