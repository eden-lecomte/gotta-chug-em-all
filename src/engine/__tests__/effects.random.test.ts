import { describe, it, expect } from 'vitest';
import { applyEffect, drainQueue, matchesCond } from '../effects';
import { makePlayer, makeState } from './factories';
import { nextInt, rollDie } from '../rng';
import { BOARD_ORIGINAL } from '../../data/boards/original';

/** Find a seed whose next die roll is exactly `face`. */
function seedFor(face: number): number {
  for (let seed = 1; seed < 100_000; seed++) {
    if (rollDie(seed)[0] === face) return seed;
  }
  throw new Error(`No seed produced face ${face}`);
}

/** Find a seed whose next Metronome pick is exactly `index`. */
function seedForSquare(index: number): number {
  const size = BOARD_ORIGINAL.squares.length;
  for (let seed = 1; seed < 100_000; seed++) {
    if (nextInt(seed, size)[0] === index) return seed;
  }
  throw new Error(`No seed produced square ${index}`);
}

describe('matchesCond', () => {
  it('matches explicit faces', () => {
    expect(matchesCond(3, { faces: [1, 2, 3] })).toBe(true);
    expect(matchesCond(4, { faces: [1, 2, 3] })).toBe(false);
  });

  it('matches parity', () => {
    expect(matchesCond(4, { parity: 'even' })).toBe(true);
    expect(matchesCond(4, { parity: 'odd' })).toBe(false);
  });
});

describe('roll effect', () => {
  it('binds the face to a variable and advances the seed', () => {
    const state = makeState({ seed: seedFor(5) });
    const next = applyEffect(state, { kind: 'roll', as: 'gary' });
    expect(next.vars.gary).toBe(5);
    expect(next.lastRoll).toBe(5);
    expect(next.seed).not.toBe(state.seed);
  });
});

describe('rollBranch effect', () => {
  it('splices the matching branch to the front of the queue', () => {
    const state = makeState({
      seed: seedFor(4),
      queue: [{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 99 } }],
    });
    const next = applyEffect(state, {
      kind: 'rollBranch',
      branches: [
        { when: { parity: 'even' }, effects: [{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 1 } }] },
        { when: { parity: 'odd' }, effects: [{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 7 } }] },
      ],
    });
    expect(next.queue).toHaveLength(2);
    expect(next.queue[0]).toEqual({ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 1 } });
  });

  it('binds the face when `as` is given, so branches can reference it', () => {
    const state = makeState({ seed: seedFor(2), phase: { name: 'resolving' } });
    const next = drainQueue({
      ...state,
      queue: [
        {
          kind: 'rollBranch',
          as: 'gio',
          branches: [
            { when: { faces: [1, 2, 3] }, effects: [{ kind: 'drink', target: 'self', amount: { kind: 'var', name: 'gio' } }] },
            { when: { faces: [4, 5, 6] }, effects: [] },
          ],
        },
      ],
    });
    expect(next.players[0].drinks).toBe(2);
  });

  it('throws when no branch matches, rather than silently doing nothing', () => {
    expect(() =>
      applyEffect(makeState(), { kind: 'rollBranch', branches: [{ when: { faces: [] }, effects: [] }] }),
    ).toThrow(/no branch/i);
  });
});

describe('rollWhile effect (Cinnabar Gym)', () => {
  it('counts consecutive evens and binds the total', () => {
    const state = makeState({ seed: seedFor(2) });
    const next = applyEffect(state, { kind: 'rollWhile', continueWhen: { parity: 'even' }, as: 'evens', max: 20 });
    expect(next.vars.evens).toBeGreaterThanOrEqual(1);
  });

  it('binds zero when the first roll already fails the condition', () => {
    const state = makeState({ seed: seedFor(3) });
    const next = applyEffect(state, { kind: 'rollWhile', continueWhen: { parity: 'even' }, as: 'evens', max: 20 });
    expect(next.vars.evens).toBe(0);
  });

  it('counts exactly the evens rolled before the first odd', () => {
    // Independently replay the seed stream: the bound count must equal the
    // number of even faces before the first odd one, with no off-by-one.
    for (let seed = 1; seed < 500; seed++) {
      let s = seed;
      let expected = 0;
      for (;;) {
        const [face, next] = rollDie(s);
        s = next;
        if (face % 2 !== 0) break;
        expected += 1;
      }
      const out = applyEffect(makeState({ seed }), {
        kind: 'rollWhile', continueWhen: { parity: 'even' }, as: 'evens', max: 20,
      });
      expect(out.vars.evens).toBe(expected);
      expect(out.seed).toBe(s);
    }
  });

  it('never exceeds max', () => {
    let state = makeState({ seed: 1 });
    for (let i = 0; i < 200; i++) {
      state = applyEffect({ ...state, seed: state.seed + i }, {
        kind: 'rollWhile', continueWhen: { parity: 'even' }, as: 'evens', max: 3,
      });
      expect(state.vars.evens).toBeLessThanOrEqual(3);
    }
  });
});

describe('rollTimes effect (Missingno)', () => {
  it('queues onFail effects when no roll succeeds', () => {
    // succeedOn an impossible face guarantees failure regardless of seed.
    const next = applyEffect(makeState(), {
      kind: 'rollTimes', times: 3, succeedOn: [],
      onSuccess: [{ kind: 'extraTurn' }],
      onFail: [{ kind: 'moveTo', square: 0 }],
    });
    expect(next.queue).toEqual([{ kind: 'moveTo', square: 0 }]);
  });

  it('queues onSuccess effects when any roll succeeds', () => {
    const next = applyEffect(makeState(), {
      kind: 'rollTimes', times: 3, succeedOn: [1, 2, 3, 4, 5, 6],
      onSuccess: [{ kind: 'extraTurn' }],
      onFail: [{ kind: 'moveTo', square: 0 }],
    });
    expect(next.queue).toEqual([{ kind: 'extraTurn' }]);
  });
});

describe('randomSquare effect (Clefairy)', () => {
  it('queues the effects of some other square', () => {
    const next = applyEffect(makeState(), { kind: 'randomSquare' });
    expect(next.log.at(-1)!.text).toMatch(/Metronome/i);
  });

  it('copies what the chosen square makes you drink', () => {
    // Square 52 (Fuchsia Gym) is a plain "drink 3", so the copy is unambiguous.
    const next = applyEffect(makeState({ seed: seedForSquare(52) }), { kind: 'randomSquare' });
    expect(next.queue).toEqual(BOARD_ORIGINAL.squares[52].effects);
  });

  it('keeps the roll that a copied amount depends on', () => {
    // Square 12 (Gary) binds `gary` and then spends it. Dropping the binder
    // would make resolveAmount throw on an unbound variable mid-turn.
    const state = applyEffect(makeState({ seed: seedForSquare(12) }), { kind: 'randomSquare' });
    expect(state.queue.map((e) => e.kind)).toEqual(['roll', 'drink', 'give']);
    expect(() => drainQueue(state)).not.toThrow();
  });

  it('drops movement, statuses and prompts rather than copying them', () => {
    // Square 25 (Haunter) only moves another player, so there is nothing to
    // drink or give and the legacy fallback applies.
    const next = applyEffect(makeState({ seed: seedForSquare(25) }), { kind: 'randomSquare' });
    expect(next.queue).toEqual([{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } }]);
  });

  it('never teleports the player by copying an Abra square', () => {
    const next = applyEffect(makeState({ seed: seedForSquare(11) }), { kind: 'randomSquare' });
    expect(JSON.stringify(next.queue)).not.toContain('moveTo');
  });

  it('falls back to drinking 2 when the chosen square has no effects', () => {
    // Square 0 (Start) is the only effect-less square, so pin the seed to it
    // rather than scanning for any queue that happens to contain a 2.
    const start = BOARD_ORIGINAL.squares[0];
    expect(start.effects).toHaveLength(0);
    const next = applyEffect(makeState({ seed: seedForSquare(0) }), { kind: 'randomSquare' });
    expect(next.queue).toEqual([{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } }]);
  });
});

describe('ifAnyPlayerHasStatus effect (Mysterious Ghost)', () => {
  const effect = {
    kind: 'ifAnyPlayerHasStatus',
    status: 'inSilphCo',
    then: [{ kind: 'drink', target: 'everyoneElse', amount: { kind: 'fixed', value: 1 } }],
    otherwise: [{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 3 } }],
  } as const;

  it('queues `then` when someone holds the status', () => {
    const state = makeState({
      players: [
        makePlayer('a'),
        makePlayer('b', { statuses: [{ id: 'inSilphCo', expires: 'leaveSquare', appliedOnSquare: 36 }] }),
      ],
    });
    expect(applyEffect(state, effect).queue).toEqual(effect.then);
  });

  it('queues `otherwise` when nobody does', () => {
    expect(applyEffect(makeState(), effect).queue).toEqual(effect.otherwise);
  });
});
