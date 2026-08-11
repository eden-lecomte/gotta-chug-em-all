// @vitest-environment jsdom
import { render, act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import GameScreen from '../GameScreen';
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

const phase = () => useGameStore.getState().state!.phase.name;

describe('a turn actually progresses', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().start(input);
  });

  it('gets from a roll all the way to the landed square without help', async () => {
    render(<GameScreen />);
    act(() => useGameStore.getState().dispatch({ type: 'ROLL' }));

    // The driver advances rolling -> moving on its own, and movement must then
    // carry itself to 'landed'. Nothing here dispatches STEP_DONE by hand:
    // that is exactly what the app has to do unaided.
    await waitFor(() => expect(phase()).toBe('landed'), { timeout: 4000 });
    expect(useGameStore.getState().state!.players[0].square).toBeGreaterThan(0);
  });

  it('walks one square per step rather than teleporting', async () => {
    render(<GameScreen />);
    act(() => useGameStore.getState().dispatch({ type: 'ROLL' }));
    await waitFor(() => expect(phase()).toBe('moving'), { timeout: 3000 });

    const squares = new Set<number>();
    await waitFor(
      () => {
        squares.add(useGameStore.getState().state!.players[0].square);
        expect(phase()).toBe('landed');
      },
      { timeout: 4000, interval: 20 },
    );
    // A roll of more than one that only ever reported its final square would
    // mean the token skipped the intermediate hops.
    expect(squares.size).toBeGreaterThan(1);
  });

  it('hands the turn to the next player after the square resolves', async () => {
    // Square 50 is Tauros: drink 2, no prompt and no note, so the turn can run
    // to completion without any further input.
    const state = useGameStore.getState().state!;
    useGameStore.setState({
      state: {
        ...state,
        phase: { name: 'landed' },
        players: [{ ...state.players[0], square: 50 }, state.players[1]],
      },
    });

    const user = userEvent.setup();
    render(<GameScreen />);
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(
      () => {
        expect(useGameStore.getState().state!.activeIndex).toBe(1);
        expect(phase()).toBe('idle');
      },
      { timeout: 4000 },
    );
    expect(useGameStore.getState().state!.players[0].drinks).toBe(2);
  });
});
