import { describe, it, expect } from 'vitest';
import { resolveAmount } from '../amount';
import type { ResolveCtx } from '../types';

const ctx: ResolveCtx = {
  config: { fullDrink: 10, trainerBattles: true, offTableChance: 1, maxMissedTurns: 6 },
  playerCount: 4,
  vars: { gary: 5, turns: 3, perTurn: 2 },
};

describe('resolveAmount', () => {
  it('resolves a fixed amount', () => {
    expect(resolveAmount({ kind: 'fixed', value: 3 }, ctx)).toBe(3);
  });

  it('resolves full to the configured vessel size', () => {
    expect(resolveAmount({ kind: 'full' }, ctx)).toBe(10);
  });

  it('resolves perPlayer to the player count', () => {
    expect(resolveAmount({ kind: 'perPlayer' }, ctx)).toBe(4);
  });

  it('reads a bound variable', () => {
    expect(resolveAmount({ kind: 'var', name: 'gary' }, ctx)).toBe(5);
  });

  it('throws on an unbound variable rather than silently yielding NaN', () => {
    expect(() => resolveAmount({ kind: 'var', name: 'nope' }, ctx)).toThrow(/nope/);
  });

  it('rounds half up and half down as asked', () => {
    const gary = { kind: 'var', name: 'gary' } as const;
    expect(resolveAmount({ kind: 'half', of: gary, round: 'up' }, ctx)).toBe(3);
    expect(resolveAmount({ kind: 'half', of: gary, round: 'down' }, ctx)).toBe(2);
  });

  it('multiplies (S.S. Anne: 3 turns x 2 drinks = 6)', () => {
    expect(
      resolveAmount(
        { kind: 'product', a: { kind: 'var', name: 'turns' }, b: { kind: 'var', name: 'perTurn' } },
        ctx,
      ),
    ).toBe(6);
  });

  it('offsets and clamps at zero (Gary 30: roll 1 means drink 0, never -1)', () => {
    expect(resolveAmount({ kind: 'offset', of: { kind: 'fixed', value: 1 }, delta: -1 }, ctx)).toBe(0);
    expect(resolveAmount({ kind: 'offset', of: { kind: 'fixed', value: 1 }, delta: -5 }, ctx)).toBe(0);
  });

  it('sums nested amounts', () => {
    expect(
      resolveAmount({ kind: 'sum', a: { kind: 'fixed', value: 2 }, b: { kind: 'full' } }, ctx),
    ).toBe(12);
  });
});
