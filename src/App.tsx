import GameScreen from './components/game/GameScreen';
import Lobby from './components/lobby/Lobby';
import { useGameStore } from './store/gameStore';

export default function App() {
  const state = useGameStore((s) => s.state);
  return state ? <GameScreen /> : <Lobby />;
}
