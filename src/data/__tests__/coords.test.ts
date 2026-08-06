import { describe, it, expect } from 'vitest';
import coords from '../boards/original.coords.json';

describe('extracted coordinates', () => {
  it('has all 63 squares with sequential ids', () => {
    expect(coords).toHaveLength(63);
    coords.forEach((c, i) => expect(c.id).toBe(i));
  });

  it('places every square inside the board', () => {
    for (const c of coords) {
      expect(c.x).toBeGreaterThan(0);
      expect(c.x).toBeLessThan(100);
      expect(c.y).toBeGreaterThan(0);
      expect(c.y).toBeLessThan(100);
    }
  });

  it('converts Start to the bottom-left of the spiral', () => {
    expect(coords[0]).toMatchObject({ x: 15.884, y: 83.755 });
  });

  it('gives every square a unique position', () => {
    const keys = coords.map((c) => `${c.x},${c.y}`);
    expect(new Set(keys).size).toBe(63);
  });
});
