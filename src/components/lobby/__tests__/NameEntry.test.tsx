// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import NameEntry from '../NameEntry';
import { useLobbyStore } from '../lobbyStore';

describe('NameEntry', () => {
  beforeEach(() => useLobbyStore.getState().reset());

  it('adds a name on submit and clears the field', async () => {
    const user = userEvent.setup();
    render(<NameEntry />);
    const input = screen.getByPlaceholderText(/enter a name/i);
    await user.type(input, 'Eden{Enter}');
    expect(screen.getByText('Eden')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('rejects blank and whitespace-only names', async () => {
    const user = userEvent.setup();
    render(<NameEntry />);
    await user.type(screen.getByPlaceholderText(/enter a name/i), '   {Enter}');
    expect(useLobbyStore.getState().drafts).toHaveLength(0);
  });

  it('rejects a duplicate name', async () => {
    const user = userEvent.setup();
    render(<NameEntry />);
    const input = screen.getByPlaceholderText(/enter a name/i);
    await user.type(input, 'Eden{Enter}');
    await user.type(input, 'Eden{Enter}');
    expect(useLobbyStore.getState().drafts).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent(/already/i);
  });

  it('removes a name', async () => {
    const user = userEvent.setup();
    render(<NameEntry />);
    await user.type(screen.getByPlaceholderText(/enter a name/i), 'Eden{Enter}');
    await user.click(screen.getByLabelText('Remove Eden'));
    expect(useLobbyStore.getState().drafts).toHaveLength(0);
  });

  it('disables continue until two players are in', async () => {
    const user = userEvent.setup();
    render(<NameEntry />);
    const button = screen.getByRole('button', { name: /pick your pok/i });
    expect(button).toBeDisabled();
    await user.type(screen.getByPlaceholderText(/enter a name/i), 'Eden{Enter}');
    expect(button).toBeDisabled();
    await user.type(screen.getByPlaceholderText(/enter a name/i), 'Cheese{Enter}');
    expect(button).toBeEnabled();
  });

  it('caps the roster at eight players', async () => {
    const user = userEvent.setup();
    render(<NameEntry />);
    const input = screen.getByPlaceholderText(/enter a name/i);
    for (let i = 0; i < 10; i++) await user.type(input, `P${i}{Enter}`);
    expect(useLobbyStore.getState().drafts).toHaveLength(8);
  });
});
