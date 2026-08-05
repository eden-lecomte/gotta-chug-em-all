import { describe, it, expect } from 'vitest';
import { STARTERS, STARTER_IDS } from '../starters';

describe('starters', () => {
  it('offers the ten legacy starters', () => {
    expect(STARTER_IDS).toHaveLength(10);
  });

  it('gives every starter a unique national dex sprite number', () => {
    const dex = STARTERS.map((s) => s.dex);
    expect(new Set(dex).size).toBe(dex.length);
  });

  it('points every starter at a still and an animated sprite', () => {
    for (const s of STARTERS) {
      expect(s.sprite).toBe(`/img/sprites/${s.dex}.png`);
      expect(s.animated).toBe(`/img/sprites/animated/${s.dex}.gif`);
    }
  });
});
