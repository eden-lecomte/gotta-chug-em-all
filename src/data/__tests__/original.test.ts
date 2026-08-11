import { describe, it, expect } from 'vitest';
import { BOARD_ORIGINAL, getSquare } from '../boards/original';

describe('board original', () => {
  it('has 63 squares ending in a finish square', () => {
    expect(BOARD_ORIGINAL.squares).toHaveLength(63);
    expect(BOARD_ORIGINAL.squares.at(-1)!.kind).toBe('finish');
    expect(BOARD_ORIGINAL.squares[0].kind).toBe('start');
  });

  it('marks the seven gold gyms', () => {
    const gold = BOARD_ORIGINAL.squares.filter((s) => s.kind === 'goldGym').map((s) => s.id);
    expect(gold).toEqual([6, 13, 19, 32, 43, 52, 58]);
  });

  it('is deeply frozen so no rule can mutate the board', () => {
    expect(Object.isFrozen(BOARD_ORIGINAL.squares)).toBe(true);
    expect(Object.isFrozen(BOARD_ORIGINAL.squares[6])).toBe(true);
    expect(Object.isFrozen(BOARD_ORIGINAL.squares[6].effects)).toBe(true);
  });

  it('links the two Abra squares to each other', () => {
    expect(getSquare(BOARD_ORIGINAL, 11).effects).toEqual([{ kind: 'moveTo', square: 28 }]);
    expect(getSquare(BOARD_ORIGINAL, 28).effects).toEqual([{ kind: 'moveTo', square: 11 }]);
  });

  it('fixes Pewter Gym so it no longer writes into Vermilion', () => {
    const json = JSON.stringify(getSquare(BOARD_ORIGINAL, 6).effects);
    expect(json).not.toContain('19');
    expect(getSquare(BOARD_ORIGINAL, 6).effects[0].kind).toBe('rollBranch');
  });

  it('fixes Meowth so only other players drink', () => {
    expect(getSquare(BOARD_ORIGINAL, 16).effects).toEqual([
      { kind: 'drink', target: 'everyoneElse', amount: { kind: 'fixed', value: 1 } },
    ]);
  });

  it('rounds both halves of Gary up, as the square text promises', () => {
    expect(getSquare(BOARD_ORIGINAL, 12).effects).toEqual([
      { kind: 'roll', as: 'gary' },
      { kind: 'drink', target: 'self', amount: { kind: 'half', of: { kind: 'var', name: 'gary' }, round: 'up' } },
      { kind: 'give', amount: { kind: 'half', of: { kind: 'var', name: 'gary' }, round: 'up' }, players: { kind: 'fixed', value: 1 } },
    ]);
  });

  it('fixes Electabuzz so it costs exactly one turn', () => {
    expect(getSquare(BOARD_ORIGINAL, 54).effects).toEqual([
      { kind: 'missTurn', amount: { kind: 'fixed', value: 1 } },
    ]);
  });

  it('gives every square non-empty display text', () => {
    for (const s of BOARD_ORIGINAL.squares) {
      expect(s.text.length).toBeGreaterThan(0);
    }
  });

  it('never references a square id outside the board', () => {
    const ids = new Set(BOARD_ORIGINAL.squares.map((s) => s.id));
    const walk = (effects: readonly unknown[]): void => {
      for (const e of effects as Array<Record<string, unknown>>) {
        if (e.kind === 'moveTo') expect(ids.has(e.square as number)).toBe(true);
        for (const v of Object.values(e)) if (Array.isArray(v)) walk(v);
        if (e.branches) for (const b of e.branches as Array<{ effects: readonly unknown[] }>) walk(b.effects);
      }
    };
    for (const s of BOARD_ORIGINAL.squares) walk(s.effects);
  });
});
