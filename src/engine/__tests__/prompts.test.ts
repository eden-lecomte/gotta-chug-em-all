import { describe, it, expect } from 'vitest';
import { applyEffect, drainQueue } from '../effects';
import { resolvePrompt } from '../prompts';
import { makePlayer, makeState } from './factories';

describe('give effect', () => {
  it('parks on a givePlayers prompt with the resolved drink count', () => {
    const next = applyEffect(makeState(), {
      kind: 'give', amount: { kind: 'fixed', value: 1 }, players: { kind: 'fixed', value: 2 },
    });
    expect(next.phase).toEqual({ name: 'prompt', prompt: { id: 'givePlayers', drinks: 1, players: 2 } });
  });

  it('resolves players: "all" to every other player', () => {
    const next = applyEffect(makeState(), {
      kind: 'give', amount: { kind: 'fixed', value: 1 }, players: 'all',
    });
    expect(next.phase).toEqual({ name: 'prompt', prompt: { id: 'givePlayers', drinks: 1, players: 'all' } });
  });

  it('applies the assignments and returns to resolving', () => {
    let state = applyEffect(makeState(), {
      kind: 'give', amount: { kind: 'fixed', value: 2 }, players: { kind: 'fixed', value: 1 },
    });
    state = resolvePrompt(state, { id: 'givePlayers', assignments: [{ playerId: 'b', drinks: 2 }] });
    expect(state.players[1].drinks).toBe(2);
    expect(state.phase).toEqual({ name: 'resolving' });
  });

  it('routes given drinks through reflect', () => {
    let state = makeState({
      players: [
        makePlayer('a'),
        makePlayer('b', { statuses: [{ id: 'reflect', expires: 'leaveSquare', appliedOnSquare: 35 }] }),
      ],
    });
    state = applyEffect(state, { kind: 'give', amount: { kind: 'fixed', value: 1 }, players: { kind: 'fixed', value: 1 } });
    state = resolvePrompt(state, { id: 'givePlayers', assignments: [{ playerId: 'b', drinks: 1 }] });
    expect(state.players[0].drinks).toBe(3);
    expect(state.players[1].drinks).toBe(0);
  });

  it('rejects assignments that hand out more drinks than allowed', () => {
    const state = applyEffect(makeState(), {
      kind: 'give', amount: { kind: 'fixed', value: 1 }, players: { kind: 'fixed', value: 1 },
    });
    expect(() =>
      resolvePrompt(state, { id: 'givePlayers', assignments: [{ playerId: 'b', drinks: 5 }] }),
    ).toThrow(/more drinks than/i);
  });
});

describe('movePlayerBy effect (Haunter)', () => {
  it('parks on choosePlayer then moves the chosen player back', () => {
    let state = makeState({ players: [makePlayer('a', { square: 25 }), makePlayer('b', { square: 20 })] });
    state = applyEffect(state, { kind: 'movePlayerBy', squares: -10 });
    expect(state.phase).toEqual({ name: 'prompt', prompt: { id: 'choosePlayer', purpose: 'move', squares: -10 } });
    state = resolvePrompt(state, { id: 'choosePlayer', playerId: 'b' });
    expect(state.players[1].square).toBe(10);
    expect(state.phase).toEqual({ name: 'resolving' });
  });
});

describe('applyStatus to a chosen player (Lapras)', () => {
  it('parks then applies the status to the chosen player', () => {
    let state = applyEffect(makeState(), {
      kind: 'applyStatus', target: 'chosen', status: 'confuseRay', expires: 'afterNextTurn',
    });
    expect(state.phase.name).toBe('prompt');
    state = resolvePrompt(state, { id: 'choosePlayer', playerId: 'c' });
    expect(state.players[2].statuses[0].id).toBe('confuseRay');
  });
});

describe('question prompts', () => {
  it('Snorlax: singing costs nothing, refusing costs 4', () => {
    // resolvePrompt only queues the penalty; drainQueue is what applies it.
    const parked = applyEffect(makeState(), { kind: 'prompt', prompt: 'snorlaxSong' });
    expect(drainQueue(resolvePrompt(parked, { id: 'snorlaxSong', sang: true })).players[0].drinks).toBe(0);
    expect(drainQueue(resolvePrompt(parked, { id: 'snorlaxSong', sang: false })).players[0].drinks).toBe(4);
  });

  it('Koffing: smoking costs nothing, refusing costs 2', () => {
    const parked = applyEffect(makeState(), { kind: 'prompt', prompt: 'koffingSmoke' });
    expect(drainQueue(resolvePrompt(parked, { id: 'koffingSmoke', smoked: true })).players[0].drinks).toBe(0);
    expect(drainQueue(resolvePrompt(parked, { id: 'koffingSmoke', smoked: false })).players[0].drinks).toBe(2);
  });

  it('Evolution: evolving costs 4 and skips the next gym; stopping grants a turn', () => {
    const parked = applyEffect(makeState(), { kind: 'prompt', prompt: 'evolution' });
    const evolved = drainQueue(resolvePrompt(parked, { id: 'evolution', evolve: true }));
    expect(evolved.players[0].drinks).toBe(4);
    expect(evolved.players[0].statuses.map((s) => s.id)).toContain('skipNextGym');

    const stopped = drainQueue(resolvePrompt(parked, { id: 'evolution', evolve: false }));
    expect(stopped.players[0].extraTurns).toBe(1);
  });

  it('Saffron: guessing the roll grants an extra turn, missing costs 2', () => {
    const parked = applyEffect(makeState({ seed: 4242 }), { kind: 'prompt', prompt: 'saffronNumber' });
    const results = [1, 2, 3, 4, 5, 6].map((guess) =>
      drainQueue(resolvePrompt(parked, { id: 'saffronNumber', guess })),
    );
    const wins = results.filter((r) => r.players[0].extraTurns === 1);
    const losses = results.filter((r) => r.players[0].drinks === 2);
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(5);
  });

  it('Chugging contest: winner gets a turn, loser misses one', () => {
    const parked = applyEffect(makeState(), { kind: 'prompt', prompt: 'chuggingContest' });
    const next = drainQueue(resolvePrompt(parked, { id: 'chuggingContest', opponentId: 'b', winnerId: 'b' }));
    expect(next.players[1].extraTurns).toBe(1);
    expect(next.players[0].missedTurns).toBe(1);
  });

  it('Pokeball: favourite not on the board means drink 3', () => {
    const parked = applyEffect(makeState(), { kind: 'prompt', prompt: 'pokeballCatch' });
    const next = drainQueue(resolvePrompt(parked, { id: 'pokeballCatch', onBoard: false }));
    expect(next.players[0].drinks).toBe(3);
  });

  it('rejects a result that does not match the pending prompt', () => {
    const parked = applyEffect(makeState(), { kind: 'prompt', prompt: 'snorlaxSong' });
    expect(() => resolvePrompt(parked, { id: 'koffingSmoke', smoked: true })).toThrow(/does not match/i);
  });
});
