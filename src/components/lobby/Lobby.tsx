import { playCue } from '../../audio/useAudio';
import type { NewGameInput } from '../../engine/setup';
import { useGameStore } from '../../store/gameStore';
import GameConfig from './GameConfig';
import NameEntry from './NameEntry';
import StarterPicker from './StarterPicker';
import MuteButton from '../game/MuteButton';
import { useLobbyStore } from './lobbyStore';

export default function Lobby() {
  const step = useLobbyStore((s) => s.step);
  const start = useGameStore((s) => s.start);

  // The Pokérap is the opening titles, not a sound effect — it belongs to the
  // tap that starts the game and nothing else. Starting it here also means it
  // begins inside a user gesture, which is what autoplay policy wants.
  const startWithFanfare = (input: NewGameInput) => {
    playCue('intro');
    start(input);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <h1 className="font-pokemon text-3xl text-yellow">Gotta Chug 'em All</h1>
        <MuteButton />
      </div>
      {step === 'names' && <NameEntry />}
      {step === 'starters' && <StarterPicker />}
      {step === 'config' && <GameConfig onStart={startWithFanfare} />}
    </main>
  );
}
