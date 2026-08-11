// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import DiceRoller from '../DiceRoller';
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

describe('DiceRoller', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().start(input);
  });

  it('renders nothing while idle', () => {
    const { container } = render(<DiceRoller />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the rolled face during the rolling phase', () => {
    useGameStore.getState().dispatch({ type: 'ROLL' });
    const phase = useGameStore.getState().state!.phase;
    if (phase.name !== 'rolling') throw new Error('Expected rolling phase');
    render(<DiceRoller />);
    expect(screen.getByRole('status')).toHaveTextContent(String(phase.face));
  });

  it('announces rolling off the table when it happens', () => {
    const state = useGameStore.getState().state!;
    useGameStore.setState({ state: { ...state, phase: { name: 'rolling', face: 3, offTable: true } } });
    render(<DiceRoller />);
    expect(screen.getByText(/off the table/i)).toBeInTheDocument();
  });
});
