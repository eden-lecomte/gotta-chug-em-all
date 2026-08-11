import { describe, it, expect } from 'vitest';
import { reduce } from '../reducer';
import { makePlayer, makeState } from './factories';
import type { GameState } from '../types';

function walkTo(state: GameState): GameState {
  let s = reduce(reduce(state, { type: 'ROLL' }), { type: 'DICE_SHOWN' });
  let guard = 0;
  while (s.phase.name === 'moving') {
    s = reduce(s, { type: 'STEP_DONE' });
    if (++guard > 100) throw new Error('Movement did not terminate');
  }
  return s;
}

const battleConfig = { fullDrink: 10, trainerBattles: true, offTableChance: 0, maxMissedTurns: 6 };

describe('trainer battles', () => {
  it('starts a battle when landing on an occupied square', () => {
    const state = makeState({
      config: battleConfig,
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 0 }), makePlayer('b', { square: 1 })],
    });
    let seen = false;
    for (let seed = 1; seed < 200 && !seen; seed++) {
      const landed = walkTo({ ...state, seed });
      if (landed.players[0].square === landed.players[1].square) {
        expect(landed.phase.name).toBe('battle');
        seen = true;
      }
    }
    expect(seen).toBe(true);
  });

  it('makes the lower roller drink the difference', () => {
    const state = makeState({
      config: battleConfig,
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 0 }), makePlayer('b', { square: 1 })],
    });
    for (let seed = 1; seed < 500; seed++) {
      const landed = walkTo({ ...state, seed });
      if (landed.phase.name !== 'battle') continue;
      const [mine, theirs] = landed.phase.rolls;
      const before = landed.players.map((p) => p.drinks);
      const after = reduce(landed, { type: 'ACK_BATTLE' }).players.map((p) => p.drinks);
      const diff = Math.abs(mine - theirs);
      if (mine > theirs) expect(after[1] - before[1]).toBe(diff);
      else if (theirs > mine) expect(after[0] - before[0]).toBe(diff);
      else expect(after).toEqual(before);
      return;
    }
    throw new Error('No battle occurred across 500 seeds');
  });

  it('hands back to the landed flow so the square card still shows', () => {
    const state = makeState({
      config: battleConfig,
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 0 }), makePlayer('b', { square: 1 })],
    });
    for (let seed = 1; seed < 500; seed++) {
      const landed = walkTo({ ...state, seed });
      if (landed.phase.name !== 'battle') continue;
      expect(reduce(landed, { type: 'ACK_BATTLE' }).phase).toEqual({ name: 'landed' });
      return;
    }
    throw new Error('No battle occurred across 500 seeds');
  });

  it('never battles when the config disables it', () => {
    const state = makeState({
      config: { ...battleConfig, trainerBattles: false },
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 0 }), makePlayer('b', { square: 1 })],
    });
    for (let seed = 1; seed < 200; seed++) {
      expect(walkTo({ ...state, seed }).phase.name).not.toBe('battle');
    }
  });

  it('never battles on the Start square, where everyone begins', () => {
    const state = makeState({
      config: battleConfig,
      phase: { name: 'moving', remaining: 1 },
      players: [makePlayer('a', { square: 62 }), makePlayer('b', { square: 0 })],
    });
    expect(reduce(state, { type: 'STEP_DONE' }).phase.name).not.toBe('battle');
  });

  it('never battles a player who has already finished', () => {
    const state = makeState({
      config: battleConfig,
      phase: { name: 'moving', remaining: 1 },
      players: [
        makePlayer('a', { square: 40 }),
        makePlayer('b', { square: 41, finishedAtTurn: 3 }),
      ],
    });
    expect(reduce(state, { type: 'STEP_DONE' }).phase).toEqual({ name: 'landed' });
  });
});
