// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import SquareModal from '../SquareModal';
import { useGameStore } from '../../../store/gameStore';
import type { GameState } from '../../../engine/types';

const input = {
  boardId: 'original',
  seed: 42,
  config: { fullDrink: 10, trainerBattles: true, offTableChance: 0, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'x' },
  ],
} as const;

function setPhase(patch: Partial<GameState>) {
  useGameStore.setState({ state: { ...useGameStore.getState().state!, ...patch } });
}

describe('SquareModal', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().start(input);
  });

  it('renders nothing while idle', () => {
    const { container } = render(<SquareModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the landed square text and action', () => {
    const state = useGameStore.getState().state!;
    setPhase({
      phase: { name: 'landed' },
      players: [{ ...state.players[0], square: 50 }, state.players[1]],
    });
    render(<SquareModal />);
    expect(screen.getByText(/wild Taurus appeared/i)).toBeInTheDocument();
    expect(screen.getByText(/Drink 2 for not being quick enough/i)).toBeInTheDocument();
  });

  it('dispatches DISMISS_SQUARE on continue', async () => {
    const user = userEvent.setup();
    const state = useGameStore.getState().state!;
    setPhase({
      phase: { name: 'landed' },
      players: [{ ...state.players[0], square: 50 }, state.players[1]],
    });
    render(<SquareModal />);
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(useGameStore.getState().state!.players[0].drinks).toBe(2);
  });

  it('shows a note and dispatches ACK_NOTE', async () => {
    const user = userEvent.setup();
    setPhase({ phase: { name: 'note', text: 'Do a waterfall' } });
    render(<SquareModal />);
    expect(screen.getByText('Do a waterfall')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /got it/i }));
    expect(useGameStore.getState().state!.phase.name).not.toBe('note');
  });

  it('shows both battle rolls and who lost', async () => {
    const user = userEvent.setup();
    const state = useGameStore.getState().state!;
    setPhase({
      phase: { name: 'battle', opponentId: 'p1', rolls: [5, 2] },
      players: [{ ...state.players[0], square: 50 }, { ...state.players[1], square: 50 }],
    });
    render(<SquareModal />);
    expect(screen.getByText(/Cheese drinks 3/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /fight/i }));
    expect(useGameStore.getState().state!.players[1].drinks).toBe(3);
  });

  it('calls a tied battle a draw', () => {
    const state = useGameStore.getState().state!;
    setPhase({
      phase: { name: 'battle', opponentId: 'p1', rolls: [4, 4] },
      players: [{ ...state.players[0], square: 50 }, { ...state.players[1], square: 50 }],
    });
    render(<SquareModal />);
    expect(screen.getByText(/draw/i)).toBeInTheDocument();
  });
});
