import { describe, it, expect } from 'vitest';
import { createGame } from '../setup';
import { reduce } from '../reducer';
import { BOARD_ORIGINAL } from '../../data/boards/original';
import type { Action, GameState, PromptResult } from '../types';

/** Answer whatever prompt is pending in a fixed, deterministic way. */
function answer(state: GameState): PromptResult {
  if (state.phase.name !== 'prompt') throw new Error('Not prompting');
  const prompt = state.phase.prompt;
  const others = state.players.filter((_, i) => i !== state.activeIndex);
  switch (prompt.id) {
    case 'givePlayers': {
      const count = prompt.players === 'all' ? others.length : prompt.players;
      return {
        id: 'givePlayers',
        assignments: others.slice(0, count).map((p) => ({ playerId: p.id, drinks: prompt.drinks })),
      };
    }
    case 'choosePlayer':
      return { id: 'choosePlayer', playerId: (others[0] ?? state.players[state.activeIndex]).id };
    case 'snorlaxSong': return { id: 'snorlaxSong', sang: true };
    case 'koffingSmoke': return { id: 'koffingSmoke', smoked: false };
    case 'evolution': return { id: 'evolution', evolve: true };
    case 'saffronNumber': return { id: 'saffronNumber', guess: 4 };
    case 'chuggingContest':
      return { id: 'chuggingContest', opponentId: others[0].id, winnerId: others[0].id };
    case 'pokeballCatch': return { id: 'pokeballCatch', onBoard: true };
  }
}

/** Play until gameOver, or throw if the machine stalls. */
function playToCompletion(start: GameState): GameState {
  let state = start;
  for (let tick = 0; tick < 20_000; tick++) {
    if (state.phase.name === 'gameOver') return state;
    const action: Action =
      state.phase.name === 'idle' ? { type: 'ROLL' }
      : state.phase.name === 'rolling' ? { type: 'DICE_SHOWN' }
      : state.phase.name === 'moving' ? { type: 'STEP_DONE' }
      : state.phase.name === 'landed' ? { type: 'DISMISS_SQUARE' }
      : state.phase.name === 'note' ? { type: 'ACK_NOTE' }
      : state.phase.name === 'outcome' ? { type: 'ACK_OUTCOME' }
      : state.phase.name === 'battle' ? { type: 'ACK_BATTLE' }
      : state.phase.name === 'prompt' ? { type: 'RESOLVE_PROMPT', result: answer(state) }
      : { type: 'END_TURN' };
    const next = reduce(state, action);
    if (next === state) throw new Error(`Stalled in phase ${state.phase.name}`);
    state = next;
  }
  throw new Error('Game did not finish within 20000 ticks');
}

const input = {
  boardId: 'original',
  seed: 20260806,
  config: { fullDrink: 10, trainerBattles: true, offTableChance: 1, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'm' },
    { name: 'Ash', starter: 'squirtle', gender: 'f' },
  ],
} as const;

describe('createGame', () => {
  it('seats every player on Start with a clean slate', () => {
    const state = createGame(input);
    expect(state.players).toHaveLength(3);
    expect(state.players.every((p) => p.square === 0 && p.drinks === 0)).toBe(true);
    expect(state.activeIndex).toBe(0);
    expect(state.phase).toEqual({ name: 'idle' });
  });

  it('gives every player a distinct id', () => {
    const state = createGame(input);
    expect(new Set(state.players.map((p) => p.id)).size).toBe(3);
  });

  it('rejects a game with fewer than two players', () => {
    expect(() => createGame({ ...input, players: [input.players[0]] })).toThrow(/at least 2/i);
  });
});

describe('a full game', () => {
  it('reaches gameOver with someone on the final square', () => {
    const final = playToCompletion(createGame(input));
    expect(final.phase).toEqual({ name: 'gameOver' });
    expect(final.players.some((p) => p.finishedAtTurn !== null)).toBe(true);
  });

  it('never produces a negative or fractional drink total', () => {
    const final = playToCompletion(createGame(input));
    for (const p of final.players) {
      expect(p.drinks).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(p.drinks)).toBe(true);
    }
  });

  it('never lets a token leave the board', () => {
    const final = playToCompletion(createGame(input));
    for (const p of final.players) {
      expect(p.square).toBeGreaterThanOrEqual(0);
      expect(p.square).toBeLessThanOrEqual(62);
    }
  });

  it('writes a log with strictly increasing sequence numbers', () => {
    const final = playToCompletion(createGame(input));
    const seqs = final.log.map((l) => l.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
  });

  it('replays identically from the same seed', () => {
    const a = playToCompletion(createGame(input));
    const b = playToCompletion(createGame(input));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('diverges from a different seed', () => {
    const a = playToCompletion(createGame(input));
    const b = playToCompletion(createGame({ ...input, seed: 999 }));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('never mutates the board data', () => {
    const before = JSON.stringify(BOARD_ORIGINAL);
    playToCompletion(createGame(input));
    expect(JSON.stringify(BOARD_ORIGINAL)).toBe(before);
  });

  it('finishes from a hundred different seeds without stalling', () => {
    // The single-seed test above only proves one path through the board. This
    // is what catches a phase transition that only a rare square reaches.
    for (let seed = 1; seed <= 100; seed++) {
      const final = playToCompletion(createGame({ ...input, seed }));
      expect(final.phase).toEqual({ name: 'gameOver' });
    }
  });
});
