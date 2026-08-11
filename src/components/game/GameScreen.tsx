import BoardView from '../board/BoardView';
import ControlSheet from './ControlSheet';
import { activePlayer } from '../../engine/selectors';
import { useGameStore } from '../../store/gameStore';
import { useTurnDriver } from './useTurnDriver';

export default function GameScreen() {
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  useTurnDriver();

  if (!state) return null;
  const active = activePlayer(state);
  const moving = state.phase.name === 'moving';

  return (
    <div className="flex h-dvh flex-col bg-crust">
      <header className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="font-pokemon text-lg text-accent">{active.name}'s turn</span>
        <span className="text-sm text-subtext">Turn {state.turnNumber}</span>
      </header>

      <div className="min-h-0 flex-1">
        <BoardView
          players={state.players}
          activeId={active.id}
          focusSquare={active.square}
          onTokenArrive={moving ? () => dispatch({ type: 'STEP_DONE' }) : undefined}
        />
      </div>

      <ControlSheet />
    </div>
  );
}
