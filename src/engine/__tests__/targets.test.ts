import { describe, it, expect } from 'vitest';
import { resolveTarget, activePlayer, updatePlayer, pushLog } from '../targets';
import type { GameState, Player } from '../types';

function player(id: string, gender: Player['gender']): Player {
  return {
    id, name: id, starter: 'bulbasaur', gender, square: 0, drinks: 0,
    missedTurns: 0, extraTurns: 0, statuses: [], finishedAtTurn: null,
  };
}

const state = {
  boardId: 'original',
  config: { fullDrink: 10, trainerBattles: true, offTableChance: 1, maxMissedTurns: 6 },
  players: [player('a', 'm'), player('b', 'f'), player('c', 'm'), player('d', 'x')],
  activeIndex: 0,
  seed: 1, turnNumber: 1, phase: { name: 'idle' }, queue: [], vars: {},
  lastRoll: null, log: [], logSeq: 0,
} as unknown as GameState;

describe('resolveTarget', () => {
  it('resolves self to just the active player', () => {
    expect(resolveTarget('self', state)).toEqual(['a']);
  });

  it('resolves everyone to all players in seat order', () => {
    expect(resolveTarget('everyone', state)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('resolves everyoneElse by excluding the active player', () => {
    expect(resolveTarget('everyoneElse', state)).toEqual(['b', 'c', 'd']);
  });

  it('resolves sameGender to players matching the active player, including them', () => {
    expect(resolveTarget('sameGender', state)).toEqual(['a', 'c']);
  });

  it('falls back to self alone when the active player did not state a gender', () => {
    const anon = { ...state, players: [player('a', 'x'), player('b', 'f')] } as GameState;
    expect(resolveTarget('sameGender', anon)).toEqual(['a']);
  });
});

describe('state helpers', () => {
  it('activePlayer reads the player at activeIndex', () => {
    expect(activePlayer(state).id).toBe('a');
  });

  it('updatePlayer replaces one player without touching the others', () => {
    const next = updatePlayer(state, 'b', (p) => ({ ...p, drinks: p.drinks + 3 }));
    expect(next.players[1].drinks).toBe(3);
    expect(next.players[0]).toBe(state.players[0]);
    expect(state.players[1].drinks).toBe(0);
  });

  it('pushLog appends with a monotonic sequence number', () => {
    const next = pushLog(pushLog(state, 'info', 'one'), 'drink', 'two');
    expect(next.log.map((l) => l.seq)).toEqual([1, 2]);
    expect(next.logSeq).toBe(2);
  });
});
