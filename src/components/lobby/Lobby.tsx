import { useGameStore } from '../../store/gameStore';
import GameConfig from './GameConfig';
import NameEntry from './NameEntry';
import StarterPicker from './StarterPicker';
import { useLobbyStore } from './lobbyStore';

export default function Lobby() {
  const step = useLobbyStore((s) => s.step);
  const start = useGameStore((s) => s.start);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <h1 className="font-pokemon text-3xl text-yellow">Gotta Chug 'em All</h1>
      {step === 'names' && <NameEntry />}
      {step === 'starters' && <StarterPicker />}
      {step === 'config' && <GameConfig onStart={start} />}
    </main>
  );
}
