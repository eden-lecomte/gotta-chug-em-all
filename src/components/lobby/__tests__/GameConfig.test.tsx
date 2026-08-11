// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import GameConfig from '../GameConfig';
import { useLobbyStore } from '../lobbyStore';

beforeEach(() => {
  useLobbyStore.getState().reset();
  useLobbyStore.getState().addName('Eden');
  useLobbyStore.getState().addName('Cheese');
  useLobbyStore.getState().setStarter(0, 'bulbasaur');
  useLobbyStore.getState().setStarter(1, 'charmander');
  useLobbyStore.getState().setStep('config');
});

describe('GameConfig', () => {
  it('starts with the legacy defaults', () => {
    render(<GameConfig onStart={vi.fn()} />);
    expect(screen.getByLabelText(/full vessel/i)).toHaveValue(10);
    expect(screen.getByLabelText(/missed turns/i)).toHaveValue(6);
    expect(screen.getByLabelText(/off the table/i)).toHaveValue(1);
    expect(screen.getByLabelText(/trainer battles/i)).toBeChecked();
  });

  it('hands the edited config and the roster to onStart', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<GameConfig onStart={onStart} />);

    await user.clear(screen.getByLabelText(/full vessel/i));
    await user.type(screen.getByLabelText(/full vessel/i), '14');
    await user.click(screen.getByLabelText(/trainer battles/i));
    await user.click(screen.getByRole('button', { name: /ready to play/i }));

    expect(onStart).toHaveBeenCalledOnce();
    const input = onStart.mock.calls[0][0];
    expect(input.config).toMatchObject({ fullDrink: 14, trainerBattles: false });
    expect(input.players).toEqual([
      { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
      { name: 'Cheese', starter: 'charmander', gender: 'x' },
    ]);
    expect(typeof input.seed).toBe('number');
  });

  it('clamps a nonsense vessel size to at least 1', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<GameConfig onStart={onStart} />);
    await user.clear(screen.getByLabelText(/full vessel/i));
    await user.type(screen.getByLabelText(/full vessel/i), '0');
    await user.click(screen.getByRole('button', { name: /ready to play/i }));
    expect(onStart.mock.calls[0][0].config.fullDrink).toBe(1);
  });
});
