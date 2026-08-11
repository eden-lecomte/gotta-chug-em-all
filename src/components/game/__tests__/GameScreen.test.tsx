// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
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
});
