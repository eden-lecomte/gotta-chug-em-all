// @vitest-environment jsdom
import { render, act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import GameScreen from '../GameScreen';
import { PHASE_DELAYS } from '../useTurnDriver';
import { useGameStore } from '../../../store/gameStore';

// These run on real timers, so every wait has to outlast the animation it is
// waiting on. Derive them rather than hard-coding, or retiming the roll breaks
// this file again.
const A_ROLL = PHASE_DELAYS.rolling! + 500;
const A_WHOLE_TURN = A_ROLL + PHASE_DELAYS.moving! * 6 + PHASE_DELAYS.turnEnd! + 1000;
/** Vitest's own 5s per-test cap is shorter than a real turn, so raise it. */
const TEST_TIMEOUT = A_WHOLE_TURN + 2000;

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
    await waitFor(() => expect(phase()).toBe('landed'), { timeout: A_WHOLE_TURN });
    expect(useGameStore.getState().state!.players[0].square).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  it('walks one square per step rather than teleporting', async () => {
    render(<GameScreen />);
    act(() => useGameStore.getState().dispatch({ type: 'ROLL' }));
    await waitFor(() => expect(phase()).toBe('moving'), { timeout: A_ROLL });

    const squares = new Set<number>();
    await waitFor(
      () => {
        squares.add(useGameStore.getState().state!.players[0].square);
        expect(phase()).toBe('landed');
      },
      { timeout: A_WHOLE_TURN, interval: 20 },
    );
    // A roll of more than one that only ever reported its final square would
    // mean the token skipped the intermediate hops.
    expect(squares.size).toBeGreaterThan(1);
  }, TEST_TIMEOUT);

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
    // The card is held back for a beat so the square is visible first, so this
    // has to wait for it rather than expecting it in the first render.
    await user.click(await screen.findByRole('button', { name: /continue/i }));

    // Tauros makes you drink 2, and that has to be acknowledged before the turn
    // can pass — the whole point of the outcome card.
    expect(await screen.findByText(/Eden drinks 2/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(
      () => {
        expect(useGameStore.getState().state!.activeIndex).toBe(1);
        expect(phase()).toBe('idle');
      },
      { timeout: A_WHOLE_TURN },
    );
    expect(useGameStore.getState().state!.players[0].drinks).toBe(2);
  }, TEST_TIMEOUT);
});
