import Lobby from './components/lobby/Lobby';
import { useGameStore } from './store/gameStore';

export default function App() {
  const state = useGameStore((s) => s.state);
  // GameScreen replaces this placeholder in Task 19.
  if (state) return <main className="grid h-dvh place-items-center">Game running</main>;
  return <Lobby />;
}
