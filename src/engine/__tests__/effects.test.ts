import { describe, it, expect } from 'vitest';
import { applyEffect, drainQueue, giveDrinks } from '../effects';
import { makePlayer, makeState } from './factories';

describe('drink effect', () => {
  it('adds drinks to the active player', () => {
    const next = applyEffect(makeState(), { kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 3 } });
    expect(next.players[0].drinks).toBe(3);
    expect(next.players[1].drinks).toBe(0);
  });

  it('adds drinks to everyone else without touching the active player', () => {
    const next = applyEffect(makeState(), { kind: 'drink', target: 'everyoneElse', amount: { kind: 'fixed', value: 1 } });
    expect(next.players.map((p) => p.drinks)).toEqual([0, 1, 1]);
  });

  it('resolves a full drink through config', () => {
    const next = applyEffect(makeState(), { kind: 'drink', target: 'self', amount: { kind: 'full' } });
    expect(next.players[0].drinks).toBe(10);
  });

  it('logs what happened', () => {
    const next = applyEffect(makeState(), { kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } });
    expect(next.log.at(-1)!.text).toMatch(/A drinks 2/);
  });
});

describe('movement effects', () => {
  it('moveTo jumps to an absolute square', () => {
    const next = applyEffect(makeState(), { kind: 'moveTo', square: 28 });
    expect(next.players[0].square).toBe(28);
  });

  it('moveBy walks backwards and clamps at Start', () => {
    const state = makeState({ players: [makePlayer('a', { square: 4 })] });
    expect(applyEffect(state, { kind: 'moveBy', squares: -10 }).players[0].square).toBe(0);
  });

  it('moveBy clamps at the final square', () => {
    const state = makeState({ players: [makePlayer('a', { square: 60 })] });
    expect(applyEffect(state, { kind: 'moveBy', squares: 10 }).players[0].square).toBe(62);
  });
});

describe('turn effects', () => {
  it('extraTurn banks a turn for the active player', () => {
    expect(applyEffect(makeState(), { kind: 'extraTurn' }).players[0].extraTurns).toBe(1);
  });

  it('missTurn is capped by config.maxMissedTurns', () => {
    const state = makeState({ config: { ...makeState().config, maxMissedTurns: 4 } });
    const next = applyEffect(state, { kind: 'missTurn', amount: { kind: 'fixed', value: 6 } });
    expect(next.players[0].missedTurns).toBe(4);
  });
});

describe('status effects', () => {
  it('applies a status to the active player and records the square', () => {
    const state = makeState({ players: [makePlayer('a', { square: 8 })] });
    const next = applyEffect(state, { kind: 'applyStatus', target: 'self', status: 'zubats', expires: 'leaveSquare' });
    expect(next.players[0].statuses).toEqual([{ id: 'zubats', expires: 'leaveSquare', appliedOnSquare: 8 }]);
  });

  it('does not stack the same status twice', () => {
    let state = makeState();
    const effect = { kind: 'applyStatus', target: 'self', status: 'reflect', expires: 'leaveSquare' } as const;
    state = applyEffect(applyEffect(state, effect), effect);
    expect(state.players[0].statuses).toHaveLength(1);
  });
});

describe('setStarter effect', () => {
  it('swaps the active player token', () => {
    const next = applyEffect(makeState(), { kind: 'setStarter', starter: 'pikachu' });
    expect(next.players[0].starter).toBe('pikachu');
  });
});

describe('note effect', () => {
  it('parks the phase on a note so the UI can show it', () => {
    const next = applyEffect(makeState(), { kind: 'note', text: 'Do a waterfall' });
    expect(next.phase).toEqual({ name: 'note', text: 'Do a waterfall' });
  });
});

describe('giveDrinks with reflect', () => {
  it('rebounds 3x onto the giver when the receiver has Porygon reflect', () => {
    const state = makeState({
      players: [
        makePlayer('a'),
        makePlayer('b', { statuses: [{ id: 'reflect', expires: 'leaveSquare', appliedOnSquare: 35 }] }),
      ],
    });
    const next = giveDrinks(state, 'b', 2, 'a');
    expect(next.players[1].drinks).toBe(0);
    expect(next.players[0].drinks).toBe(6);
  });

  it('applies normally when the receiver has no reflect', () => {
    const next = giveDrinks(makeState(), 'b', 2, 'a');
    expect(next.players[1].drinks).toBe(2);
    expect(next.players[0].drinks).toBe(0);
  });
});

describe('drainQueue', () => {
  it('applies every queued effect in order', () => {
    const state = makeState({
      queue: [
        { kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 1 } },
        { kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } },
      ],
    });
    const next = drainQueue(state);
    expect(next.players[0].drinks).toBe(3);
    expect(next.queue).toHaveLength(0);
    expect(next.phase).toEqual({ name: 'turnEnd' });
  });

  it('stops and keeps the remaining queue when an effect parks the phase', () => {
    const state = makeState({
      queue: [
        { kind: 'note', text: 'pause here' },
        { kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 5 } },
      ],
    });
    const next = drainQueue(state);
    expect(next.phase).toEqual({ name: 'note', text: 'pause here' });
    expect(next.queue).toHaveLength(1);
    expect(next.players[0].drinks).toBe(0);
  });
});
