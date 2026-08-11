// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GameScreen from '../GameScreen';
import { OUTCOME_DIE_MS } from '../OutcomeDie';
import { LANDING_BEAT_MS } from '../useTurnDriver';
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

describe('GameScreen', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().start(input);
  });

  it('renders the board with a token per player', () => {
    render(<GameScreen />);
    expect(screen.getByLabelText('Eden on square 0')).toBeInTheDocument();
    expect(screen.getByLabelText('Cheese on square 0')).toBeInTheDocument();
  });

  it('names whose turn it is', () => {
    render(<GameScreen />);
    expect(screen.getByText(/Eden's turn/i)).toBeInTheDocument();
  });

  it('renders nothing when no game is running', () => {
    useGameStore.getState().reset();
    const { container } = render(<GameScreen />);
    expect(container).toBeEmptyDOMElement();
  });

  describe('the landing beat', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    /** Put Eden on Tauros (square 50), freshly landed. */
    function land() {
      const state = useGameStore.getState().state!;
      useGameStore.setState({
        state: {
          ...state,
          phase: { name: 'landed' },
          players: [{ ...state.players[0], square: 50 }, state.players[1]],
        },
      });
    }

    it('leaves the square uncovered for a beat before the card arrives', () => {
      land();
      render(<GameScreen />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      act(() => void vi.advanceTimersByTime(LANDING_BEAT_MS));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('shows a zoomed crop of the square the player landed on', () => {
      land();
      render(<GameScreen />);
      act(() => void vi.advanceTimersByTime(LANDING_BEAT_MS));
      expect(screen.getByAltText(/square 50 on the original board/i)).toBeInTheDocument();
    });

    it('rolls a plain die before showing an outcome a die decided', () => {
      const state = useGameStore.getState().state!;
      useGameStore.setState({
        state: {
          ...state,
          phase: { name: 'outcome', title: 'What happened', lines: ['Eden drinks 4'], face: 4 },
        },
      });
      render(<GameScreen />);

      // The die rolls first; the card that states the result waits for it. The
      // Poké Ball throw is reserved for the turn's own roll.
      expect(screen.getByRole('status')).toHaveTextContent('4');
      expect(screen.queryByAltText(/Poké Ball/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Eden drinks 4')).not.toBeInTheDocument();

      act(() => void vi.advanceTimersByTime(OUTCOME_DIE_MS));
      expect(screen.getByText('Eden drinks 4')).toBeInTheDocument();
    });

    it('shows an outcome no die decided straight away', () => {
      const state = useGameStore.getState().state!;
      useGameStore.setState({
        state: {
          ...state,
          phase: { name: 'outcome', title: 'What happened', lines: ['Eden drinks 2'], face: null },
        },
      });
      render(<GameScreen />);
      expect(screen.getByText('Eden drinks 2')).toBeInTheDocument();
    });
  });
});
