// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import GameOver from '../GameOver';
import { useGameStore } from '../../../store/gameStore';
import { useLobbyStore } from '../../lobby/lobbyStore';

const input = {
  boardId: 'original',
  seed: 42,
  config: { fullDrink: 10, trainerBattles: false, offTableChance: 0, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'x' },
  ],
} as const;

function finish() {
  const state = useGameStore.getState().state!;
  useGameStore.setState({
    state: {
      ...state,
      phase: { name: 'gameOver' },
      players: [
        { ...state.players[0], square: 62, drinks: 31, finishedAtTurn: 40 },
        { ...state.players[1], square: 48, drinks: 52 },
      ],
    },
  });
}

describe('GameOver', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useLobbyStore.getState().reset();
    useGameStore.getState().start(input);
  });

  it('renders nothing before the game is over', () => {
    const { container } = render(<GameOver />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names the winner', () => {
    finish();
    render(<GameOver />);
    expect(screen.getByText(/Eden wins/i)).toBeInTheDocument();
  });

  it('lists final standings with drink totals', () => {
    finish();
    render(<GameOver />);
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.getByText('52')).toBeInTheDocument();
  });

  it('calls out who drank the most', () => {
    finish();
    render(<GameOver />);
    expect(screen.getByText(/Cheese drank the most/i)).toBeInTheDocument();
  });

  it('resets both stores on play again', async () => {
    const user = userEvent.setup();
    finish();
    render(<GameOver />);
    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(useGameStore.getState().state).toBeNull();
    expect(useLobbyStore.getState().step).toBe('names');
  });
});
