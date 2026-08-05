import { describe, it, expect } from 'vitest';
import { nextInt, rollDie, rollPercent } from '../rng';

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    expect(rollDie(12345)).toEqual(rollDie(12345));
  });

  it('produces a different seed each call so sequences advance', () => {
    const [, s1] = rollDie(12345);
    expect(s1).not.toBe(12345);
    const [a] = rollDie(12345);
    const [b] = rollDie(s1);
    expect([a, b].every((f) => f >= 1 && f <= 6)).toBe(true);
  });

  it('rollDie only ever returns 1..6', () => {
    let seed = 1;
    for (let i = 0; i < 10_000; i++) {
      const [face, next] = rollDie(seed);
      expect(face).toBeGreaterThanOrEqual(1);
      expect(face).toBeLessThanOrEqual(6);
      seed = next;
    }
  });

  it('rollDie covers all six faces over many rolls', () => {
    const seen = new Set<number>();
    let seed = 99;
    for (let i = 0; i < 500; i++) {
      const [face, next] = rollDie(seed);
      seen.add(face);
      seed = next;
    }
    expect(seen.size).toBe(6);
  });

  it('nextInt respects the exclusive upper bound', () => {
    let seed = 7;
    for (let i = 0; i < 1000; i++) {
      const [v, next] = nextInt(seed, 63);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(63);
      seed = next;
    }
  });

  it('rollPercent stays within 0..99', () => {
    let seed = 3;
    for (let i = 0; i < 1000; i++) {
      const [v, next] = rollPercent(seed);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(100);
      seed = next;
    }
  });
});
