// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAudioStore, playCry, playCue } from '../useAudio';

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

  it('plays a cry once unmuted', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    useAudioStore.getState().toggleMute();
    playCry(25);
    expect(play).toHaveBeenCalledOnce();
  });

  it('swallows a rejected play promise instead of throwing', () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('blocked'));
    useAudioStore.getState().toggleMute();
    expect(() => playCry(1)).not.toThrow();
  });

  describe('muting', () => {
    it('silences a sound that has already started', () => {
      vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
      const muted = vi.spyOn(window.HTMLMediaElement.prototype, 'muted', 'set');

      useAudioStore.getState().toggleMute();
      playCue('intro');
      muted.mockClear();

      // The point of the button: the track already playing goes quiet, rather
      // than only the next one being suppressed.
      useAudioStore.getState().toggleMute();
      expect(muted).toHaveBeenCalledWith(true);
    });

    it('brings a muted track back without restarting it', () => {
      vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
      const muted = vi.spyOn(window.HTMLMediaElement.prototype, 'muted', 'set');

      // Music runs while muted so unmuting mid-track has something to reveal.
      playCue('intro');
      muted.mockClear();

      useAudioStore.getState().toggleMute();
      expect(muted).toHaveBeenCalledWith(false);
    });
  });
});
