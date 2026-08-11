// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import StarterPicker from '../StarterPicker';
import { useLobbyStore } from '../lobbyStore';

function seed(names: string[]) {
  const store = useLobbyStore.getState();
  store.reset();
  names.forEach((n) => useLobbyStore.getState().addName(n));
  useLobbyStore.getState().setStep('starters');
}

describe('StarterPicker', () => {
  beforeEach(() => seed(['Eden', 'Cheese']));

  it('prompts the first player by name', () => {
    render(<StarterPicker />);
    expect(screen.getByText(/Eden, pick your favourite/i)).toBeInTheDocument();
  });

  it('records the choice and moves to the next player', async () => {
    const user = userEvent.setup();
    render(<StarterPicker />);
    await user.click(screen.getByRole('button', { name: /bulbasaur/i }));
    expect(useLobbyStore.getState().drafts[0].starter).toBe('bulbasaur');
    expect(screen.getByText(/Cheese, pick your favourite/i)).toBeInTheDocument();
  });

  it('disables a starter another player already took', async () => {
    const user = userEvent.setup();
    render(<StarterPicker />);
    await user.click(screen.getByRole('button', { name: /bulbasaur/i }));
    expect(screen.getByRole('button', { name: /bulbasaur/i })).toBeDisabled();
  });

  it('records an optional gender', async () => {
    const user = userEvent.setup();
    render(<StarterPicker />);
    await user.click(screen.getByRole('button', { name: /^guy$/i }));
    expect(useLobbyStore.getState().drafts[0].gender).toBe('m');
  });

  it('advances to config once everyone has chosen', async () => {
    const user = userEvent.setup();
    render(<StarterPicker />);
    await user.click(screen.getByRole('button', { name: /bulbasaur/i }));
    await user.click(screen.getByRole('button', { name: /charmander/i }));
    expect(useLobbyStore.getState().step).toBe('config');
  });

  it('goes back to name entry', async () => {
    const user = userEvent.setup();
    render(<StarterPicker />);
    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(useLobbyStore.getState().step).toBe('names');
  });
});
