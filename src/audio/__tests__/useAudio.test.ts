// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAudioStore, playSfx } from '../useAudio';

describe('useAudio', () => {
  beforeEach(() => {
    localStorage.clear();
    useAudioStore.setState({ muted: true });
    vi.restoreAllMocks();
  });

  it('starts muted so nothing autoplays', () => {
    expect(useAudioStore.getState().muted).toBe(true);
  });

  it('toggles and persists the preference', () => {
    useAudioStore.getState().toggleMute();
    expect(useAudioStore.getState().muted).toBe(false);
    expect(localStorage.getItem('gcea:muted')).toBe('false');
  });

  it('plays nothing while muted', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    playSfx('roll');
    expect(play).not.toHaveBeenCalled();
  });

  it('plays once unmuted', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    useAudioStore.getState().toggleMute();
    playSfx('roll');
    expect(play).toHaveBeenCalledOnce();
  });

  it('swallows a rejected play promise instead of throwing', async () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('blocked'));
    useAudioStore.getState().toggleMute();
    expect(() => playSfx('roll')).not.toThrow();
  });
});
