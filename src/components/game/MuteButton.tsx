import { useAudioStore } from '../../audio/useAudio';

export default function MuteButton() {
  const muted = useAudioStore((s) => s.muted);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      className="min-h-11 min-w-11 rounded-lg text-lg text-subtext"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
