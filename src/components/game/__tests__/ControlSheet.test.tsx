// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import ControlSheet from '../ControlSheet';
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

describe('ControlSheet', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().start(input);
  });

  it('offers a roll button on the active player turn', () => {
    render(<ControlSheet />);
    expect(screen.getByRole('button', { name: /roll/i })).toBeEnabled();
  });

  it('dispatches ROLL when tapped', async () => {
    const user = userEvent.setup();
    render(<ControlSheet />);
    await user.click(screen.getByRole('button', { name: /roll/i }));
    expect(useGameStore.getState().state!.phase.name).toBe('rolling');
  });

  it('disables the roll button outside the idle phase', async () => {
    const user = userEvent.setup();
    render(<ControlSheet />);
    await user.click(screen.getByRole('button', { name: /roll/i }));
    expect(screen.getByRole('button', { name: /roll/i })).toBeDisabled();
  });

  it('opens and closes the detail sheet', async () => {
    const user = userEvent.setup();
    render(<ControlSheet />);
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /scores & log/i }));
    expect(screen.getByRole('log')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close/i }));
    // The sheet animates out, so it is still mounted the instant the click
    // resolves; wait for AnimatePresence to finish removing it.
    await waitFor(() => expect(screen.queryByRole('log')).not.toBeInTheDocument());
  });

  it('lists active statuses so nobody forgets they are confused', () => {
    const state = useGameStore.getState().state!;
    useGameStore.setState({
      state: {
        ...state,
        players: [
          { ...state.players[0], statuses: [{ id: 'zubats', expires: 'leaveSquare', appliedOnSquare: 8 }] },
          state.players[1],
        ],
      },
    });
    render(<ControlSheet />);
    expect(screen.getByText(/Confused by Zubats/i)).toBeInTheDocument();
  });
});
