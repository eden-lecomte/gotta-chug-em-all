// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../App';
import { useGameStore } from '../store/gameStore';
import { useLobbyStore } from '../components/lobby/lobbyStore';

describe('end to end', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useLobbyStore.getState().reset();
  });

  it('gets from an empty lobby to a rolled die', async () => {
    const user = userEvent.setup();
    render(<App />);

    const nameInput = screen.getByPlaceholderText(/enter a name/i);
    await user.type(nameInput, 'Eden{Enter}');
    await user.type(nameInput, 'Cheese{Enter}');
    await user.click(screen.getByRole('button', { name: /pick your pok/i }));

    await user.click(screen.getByRole('button', { name: /bulbasaur/i }));
    await user.click(screen.getByRole('button', { name: /charmander/i }));
    await user.click(screen.getByRole('button', { name: /ready to play/i }));

    expect(screen.getByText(/Eden's turn/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Eden on square 0')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /roll the dice/i }));
    await waitFor(() => expect(useGameStore.getState().state!.lastRoll).not.toBeNull());
  });
});
