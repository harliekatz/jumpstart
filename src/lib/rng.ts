/**
 * Deterministic pseudo-random numbers.
 *
 * Every synthetic figure in this app — market prices, community activity,
 * cohort comparisons — comes from here. A fixed seed means two people opening
 * the app see the same numbers, and a test can assert on an exact value. Using
 * Math.random would make all of that unverifiable.
 *
 * mulberry32: 32-bit state, uniform output, fast. Not cryptographic. Nothing
 * here needs to be unpredictable, only reproducible.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turns a string into a 32-bit seed, so names can seed their own streams. */
export function hashSeed(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Standard normal via Box-Muller. The market model needs gaussian shocks, and
 * summing uniforms would give the wrong tail behaviour.
 */
export function gaussian(next: () => number): number {
  let u = 0;
  let v = 0;
  // next() can return exactly 0, and log(0) is -Infinity.
  while (u === 0) u = next();
  while (v === 0) v = next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Picks one element deterministically. Returns undefined only for an empty list. */
export function pick<T>(items: readonly T[], next: () => number): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(next() * items.length)];
}
