import BoardView from '../board/BoardView';
import ControlSheet from './ControlSheet';
import DiceRoller from './DiceRoller';
import GameOver from './GameOver';
import MuteButton from './MuteButton';
import PromptModal from './PromptModal';
import SquareModal from './SquareModal';
import { activePlayer } from '../../engine/selectors';
import { useGameStore } from '../../store/gameStore';
import { useTurnDriver } from './useTurnDriver';

export default function GameScreen() {
  const state = useGameStore((s) => s.state);
  useTurnDriver();

  if (!state) return null;
  const active = activePlayer(state);

  return (
    <div className="flex h-dvh flex-col bg-crust">
      <header className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="font-pokemon text-lg text-accent">{active.name}'s turn</span>
        <span className="flex items-center gap-2 text-sm text-subtext">
          Turn {state.turnNumber}
          <MuteButton />
        </span>
      </header>

      <div className="min-h-0 flex-1">
        <BoardView
          players={state.players}
          activeId={active.id}
          focusSquare={active.square}
        />
      </div>

      <ControlSheet />
      <DiceRoller />
      <SquareModal />
      <PromptModal />
      <GameOver />
    </div>
  );
}
