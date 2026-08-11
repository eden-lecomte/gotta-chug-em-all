// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { useGameStore } from './store/gameStore';

describe('App', () => {
  beforeEach(() => useGameStore.getState().reset());

  it('shows the lobby when no game is running', () => {
    render(<App />);
    expect(screen.getByText(/Gotta Chug 'em All/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter a name/i)).toBeInTheDocument();
  });
});
