import { BOARD_ORIGINAL, getSquare } from '../../data/boards/original';
import { activePlayer } from '../../engine/selectors';
import { useGameStore } from '../../store/gameStore';
import SquareCrop from '../board/SquareCrop';
import Modal from '../ui/Modal';

export default function SquareModal() {
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  if (!state) return null;

  const active = activePlayer(state);
  const phase = state.phase;

  if (phase.name === 'landed') {
    const square = getSquare(BOARD_ORIGINAL, active.square);
    return (
      <Modal
        title={square.text}
        actions={
          <button
            type="button"
            onClick={() => dispatch({ type: 'DISMISS_SQUARE' })}
            className="min-h-14 flex-1 rounded-xl bg-accent font-pokemon text-lg text-crust"
          >
            Continue
          </button>
        }
      >
        <SquareCrop squareId={active.square} />
        <p>{square.action}</p>
      </Modal>
    );
  }

  if (phase.name === 'note') {
    return (
      <Modal
        title="House rule"
        actions={
          <button
            type="button"
            onClick={() => dispatch({ type: 'ACK_NOTE' })}
            className="min-h-14 flex-1 rounded-xl bg-accent font-pokemon text-lg text-crust"
          >
            Got it
          </button>
        }
      >
        <p>{phase.text}</p>
      </Modal>
    );
  }

  if (phase.name === 'battle') {
    const [mine, theirs] = phase.rolls;
    const opponent = state.players.find((p) => p.id === phase.opponentId)!;
    const diff = Math.abs(mine - theirs);
    const outcome =
      diff === 0
        ? "It's a draw — nobody drinks."
        : mine > theirs
          ? `${opponent.name} drinks ${diff}.`
          : `${active.name} drinks ${diff}.`;

    return (
      <Modal
        title="Trainer battle!"
        actions={
          <button
            type="button"
            onClick={() => dispatch({ type: 'ACK_BATTLE' })}
            className="min-h-14 flex-1 rounded-xl bg-red font-pokemon text-lg text-crust"
          >
            Fight!
          </button>
        }
      >
        <p>
          {active.name} rolled {mine}, {opponent.name} rolled {theirs}.
        </p>
        <p className="font-semibold">{outcome}</p>
      </Modal>
    );
  }

  return null;
}
