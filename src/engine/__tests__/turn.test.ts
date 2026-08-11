import { describe, it, expect } from 'vitest';
import { reduce } from '../reducer';
import { makePlayer, makeState } from './factories';
import { rollDie } from '../rng';
import type { GameState } from '../types';

function seedFor(face: number): number {
  for (let seed = 1; seed < 100_000; seed++) if (rollDie(seed)[0] === face) return seed;
  throw new Error(`No seed produced face ${face}`);
}

/** Roll, watch the dice, then walk the token all the way to its square. */
function rollAndWalk(state: GameState): GameState {
  let s = reduce(reduce(state, { type: 'ROLL' }), { type: 'DICE_SHOWN' });
  let guard = 0;
  while (s.phase.name === 'moving') {
    s = reduce(s, { type: 'STEP_DONE' });
    if (++guard > 100) throw new Error('Movement did not terminate');
  }
  return s;
}

describe('rolling', () => {
  it('goes idle -> rolling -> moving -> landed', () => {
    const state = makeState({ seed: seedFor(3), phase: { name: 'idle' } });
    const rolling = reduce(state, { type: 'ROLL' });
    expect(rolling.phase).toMatchObject({ name: 'rolling', face: 3 });

    const moving = reduce(rolling, { type: 'DICE_SHOWN' });
    expect(moving.phase).toEqual({ name: 'moving', remaining: 3 });

    const landed = rollAndWalk(state);
    expect(landed.phase).toEqual({ name: 'landed' });
    expect(landed.players[0].square).toBe(3);
  });

  it('ignores ROLL outside the idle phase', () => {
    const state = makeState({ phase: { name: 'landed' } });
    expect(reduce(state, { type: 'ROLL' })).toBe(state);
  });

  it('halves movement under String Shot', () => {
    const state = makeState({
      seed: seedFor(5),
      phase: { name: 'idle' },
      players: [makePlayer('a', { statuses: [{ id: 'stringShot', expires: 'afterNextTurn', appliedOnSquare: 3 }] })],
    });
    expect(rollAndWalk(state).players[0].square).toBe(3);
  });
});

describe('gold gyms', () => {
  it('stops a player who would pass straight through', () => {
    const state = makeState({
      seed: seedFor(5),
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 3 })],
    });
    // Square 6 is Pewter Gym; a 5 from square 3 would reach 8.
    expect(rollAndWalk(state).players[0].square).toBe(6);
  });

  it('lets an evolved player walk past and consumes the status', () => {
    const state = makeState({
      seed: seedFor(5),
      phase: { name: 'idle' },
      players: [makePlayer('a', {
        square: 3,
        statuses: [{ id: 'skipNextGym', expires: 'endOfGame', appliedOnSquare: 34 }],
      })],
    });
    const landed = rollAndWalk(state);
    expect(landed.players[0].square).toBe(8);
    expect(landed.players[0].statuses).toHaveLength(0);
  });
});

describe('zubats', () => {
  it('pins the player and costs a drink on a roll of 1 or 2', () => {
    const state = makeState({
      seed: seedFor(2),
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 8, statuses: [{ id: 'zubats', expires: 'leaveSquare', appliedOnSquare: 8 }] })],
    });
    const landed = rollAndWalk(state);
    expect(landed.players[0].square).toBe(8);
    expect(landed.players[0].drinks).toBe(1);
  });

  it('lets the player leave on a roll of 3 or more', () => {
    const state = makeState({
      seed: seedFor(4),
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 8, statuses: [{ id: 'zubats', expires: 'leaveSquare', appliedOnSquare: 8 }] })],
    });
    const landed = rollAndWalk(state);
    expect(landed.players[0].square).toBe(12);
    expect(landed.players[0].statuses).toHaveLength(0);
  });
});

describe('confuse ray', () => {
  const confused = (seed: number) => makeState({
    seed,
    phase: { name: 'idle' },
    players: [makePlayer('a', { square: 20, statuses: [{ id: 'confuseRay', expires: 'rollToClear', appliedOnSquare: 38 }] })],
  });

  it('costs the turn and keeps the status on a 4-6', () => {
    const landed = rollAndWalk(confused(seedFor(5)));
    expect(landed.players[0].square).toBe(20);
    expect(landed.players[0].statuses.map((s) => s.id)).toEqual(['confuseRay']);
    expect(landed.phase).toEqual({ name: 'turnEnd' });
  });

  it('clears on a 1-3 and the player moves that many squares', () => {
    const landed = rollAndWalk(confused(seedFor(3)));
    expect(landed.players[0].statuses).toHaveLength(0);
    expect(landed.players[0].square).toBe(23);
  });
});

describe('resolving and ending a turn', () => {
  it('queues the landed square effects on DISMISS_SQUARE', () => {
    // Square 50 is Tauros: drink 2, no prompts.
    let state = makeState({ phase: { name: 'landed' }, players: [makePlayer('a', { square: 50 }), makePlayer('b')] });
    state = reduce(state, { type: 'DISMISS_SQUARE' });
    expect(state.players[0].drinks).toBe(2);
    expect(state.phase).toEqual({ name: 'turnEnd' });
  });

  it('passes the turn to the next player on END_TURN', () => {
    const state = makeState({ phase: { name: 'turnEnd' } });
    expect(reduce(state, { type: 'END_TURN' }).activeIndex).toBe(1);
  });

  it('keeps the turn with a player who banked an extra turn', () => {
    const state = makeState({
      phase: { name: 'turnEnd' },
      players: [makePlayer('a', { extraTurns: 1 }), makePlayer('b')],
    });
    const next = reduce(state, { type: 'END_TURN' });
    expect(next.activeIndex).toBe(0);
    expect(next.players[0].extraTurns).toBe(0);
    expect(next.phase).toEqual({ name: 'idle' });
  });

  it('skips a player who owes missed turns and decrements the debt', () => {
    const state = makeState({
      phase: { name: 'turnEnd' },
      players: [makePlayer('a'), makePlayer('b', { missedTurns: 2 }), makePlayer('c')],
    });
    const next = reduce(state, { type: 'END_TURN' });
    expect(next.activeIndex).toBe(2);
    expect(next.players[1].missedTurns).toBe(1);
  });

  it('charges Silph Co upkeep before the next player can roll', () => {
    const state = makeState({
      phase: { name: 'turnEnd' },
      players: [
        makePlayer('a'),
        makePlayer('b', { square: 36, statuses: [{ id: 'inSilphCo', expires: 'leaveSquare', appliedOnSquare: 36 }] }),
      ],
    });
    const next = reduce(state, { type: 'END_TURN' });
    expect(next.players[1].drinks).toBe(2);
    expect(next.phase).toEqual({ name: 'idle' });
  });

  it('clears per-turn statuses when the turn passes', () => {
    const state = makeState({
      phase: { name: 'turnEnd' },
      players: [makePlayer('a', { statuses: [{ id: 'doubleMove', expires: 'afterNextTurn', appliedOnSquare: 20 }] }), makePlayer('b')],
    });
    expect(reduce(state, { type: 'END_TURN' }).players[0].statuses).toHaveLength(0);
  });
});

describe('winning', () => {
  it('ends the game when a player reaches the final square', () => {
    const state = makeState({
      seed: seedFor(2),
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 61 }), makePlayer('b')],
    });
    let s = rollAndWalk(state);
    s = reduce(s, { type: 'DISMISS_SQUARE' });
    while (s.phase.name === 'prompt') {
      s = reduce(s, { type: 'RESOLVE_PROMPT', result: { id: 'givePlayers', assignments: [] } });
    }
    s = reduce(s, { type: 'END_TURN' });
    expect(s.phase).toEqual({ name: 'gameOver' });
    expect(s.players[0].finishedAtTurn).not.toBeNull();
  });
});

describe('notes', () => {
  it('parks on a note and resumes on ACK_NOTE', () => {
    // Square 21 is Magikarp Splash: a single note.
    let state = makeState({ phase: { name: 'landed' }, players: [makePlayer('a', { square: 21 })] });
    state = reduce(state, { type: 'DISMISS_SQUARE' });
    expect(state.phase.name).toBe('note');
    state = reduce(state, { type: 'ACK_NOTE' });
    expect(state.phase).toEqual({ name: 'turnEnd' });
  });
});
