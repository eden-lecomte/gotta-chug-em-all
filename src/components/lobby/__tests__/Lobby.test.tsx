// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import Lobby from '../Lobby';
import { useLobbyStore } from '../lobbyStore';
import { useGameStore } from '../../../store/gameStore';

beforeEach(() => {
  useLobbyStore.getState().reset();
  useGameStore.getState().reset();
});

describe('Lobby', () => {
  it('walks names to starters to config and starts a game', async () => {
    const user = userEvent.setup();
    render(<Lobby />);

    const input = screen.getByPlaceholderText(/enter a name/i);
    await user.type(input, 'Eden{Enter}');
    await user.type(input, 'Cheese{Enter}');
    await user.click(screen.getByRole('button', { name: /pick your pok/i }));

    await user.click(screen.getByRole('button', { name: /bulbasaur/i }));
    await user.click(screen.getByRole('button', { name: /charmander/i }));

    await user.click(screen.getByRole('button', { name: /ready to play/i }));

    const state = useGameStore.getState().state;
    expect(state).not.toBeNull();
    expect(state!.players.map((p) => p.name)).toEqual(['Eden', 'Cheese']);
    expect(state!.players.map((p) => p.starter)).toEqual(['bulbasaur', 'charmander']);
  });
});
