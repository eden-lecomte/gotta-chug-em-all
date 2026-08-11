import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';
import { createGame } from '../../engine/setup';
import { reduce } from '../../engine/reducer';

const input = {
  boardId: 'original',
  seed: 42,
  config: { fullDrink: 10, trainerBattles: false, offTableChance: 0, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'm' },
  ],
} as const;

describe('gameStore', () => {
  beforeEach(() => useGameStore.getState().reset());

  it('starts with no game', () => {
    expect(useGameStore.getState().state).toBeNull();
  });

  it('creates a game on start', () => {
    useGameStore.getState().start(input);
    expect(useGameStore.getState().state!.players).toHaveLength(2);
  });

  it('applies dispatched actions through the reducer', () => {
    useGameStore.getState().start(input);
    useGameStore.getState().dispatch({ type: 'ROLL' });
    expect(useGameStore.getState().state!.phase.name).toBe('rolling');
  });

  it('records every dispatched action for replay', () => {
    useGameStore.getState().start(input);
    useGameStore.getState().dispatch({ type: 'ROLL' });
    useGameStore.getState().dispatch({ type: 'DICE_SHOWN' });
    expect(useGameStore.getState().actionLog).toEqual([{ type: 'ROLL' }, { type: 'DICE_SHOWN' }]);
  });

  it('replaying the action log reproduces the same state', () => {
    useGameStore.getState().start(input);
    const store = useGameStore.getState();
    store.dispatch({ type: 'ROLL' });
    store.dispatch({ type: 'DICE_SHOWN' });
    store.dispatch({ type: 'STEP_DONE' });

    const live = useGameStore.getState().state!;
    const replayed = useGameStore.getState().actionLog.reduce(reduce, createGame(input));
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(live));
  });

  it('ignores dispatches before a game exists', () => {
    useGameStore.getState().dispatch({ type: 'ROLL' });
    expect(useGameStore.getState().state).toBeNull();
    expect(useGameStore.getState().actionLog).toHaveLength(0);
  });
});
