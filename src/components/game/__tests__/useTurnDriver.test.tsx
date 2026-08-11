// @vitest-environment jsdom
import { render, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PHASE_DELAYS, useTurnDriver } from '../useTurnDriver';
import { useGameStore } from '../../../store/gameStore';

const input = {
  boardId: 'original',
  seed: 42,
  config: { fullDrink: 10, trainerBattles: false, offTableChance: 0, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'x' },
  ],
} as const;

function Harness() {
  useTurnDriver();
  return null;
}

describe('useTurnDriver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().reset();
    useGameStore.getState().start(input);
  });
  afterEach(() => vi.useRealTimers());

  it('does nothing while the game is idle', () => {
    render(<Harness />);
    act(() => void vi.advanceTimersByTime(5000));
    expect(useGameStore.getState().state!.phase.name).toBe('idle');
  });

  it('advances past the rolling phase after the dice dwell', () => {
    render(<Harness />);
    act(() => useGameStore.getState().dispatch({ type: 'ROLL' }));
    expect(useGameStore.getState().state!.phase.name).toBe('rolling');
    act(() => void vi.advanceTimersByTime(PHASE_DELAYS.rolling!));
    expect(useGameStore.getState().state!.phase.name).toBe('moving');
  });

  it('ends the turn automatically after the turnEnd dwell', () => {
    render(<Harness />);
    act(() => useGameStore.getState().dispatch({ type: 'ROLL' }));
    act(() => void vi.advanceTimersByTime(PHASE_DELAYS.rolling!));
    let guard = 0;
    while (useGameStore.getState().state!.phase.name === 'moving') {
      act(() => useGameStore.getState().dispatch({ type: 'STEP_DONE' }));
      if (++guard > 50) throw new Error('Movement did not terminate');
    }
    act(() => useGameStore.getState().dispatch({ type: 'DISMISS_SQUARE' }));
    if (useGameStore.getState().state!.phase.name === 'turnEnd') {
      act(() => void vi.advanceTimersByTime(PHASE_DELAYS.turnEnd!));
      expect(useGameStore.getState().state!.phase.name).toBe('idle');
    }
  });

  it('never auto-advances a phase that is waiting on the player', () => {
    render(<Harness />);
    act(() => useGameStore.getState().dispatch({ type: 'ROLL' }));
    act(() => void vi.advanceTimersByTime(PHASE_DELAYS.rolling!));
    let guard = 0;
    while (useGameStore.getState().state!.phase.name === 'moving') {
      act(() => useGameStore.getState().dispatch({ type: 'STEP_DONE' }));
      if (++guard > 50) break;
    }
    const parked = useGameStore.getState().state!.phase.name;
    expect(parked).toBe('landed');
    act(() => void vi.advanceTimersByTime(30_000));
    expect(useGameStore.getState().state!.phase.name).toBe('landed');
  });
});
