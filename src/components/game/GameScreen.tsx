import { useEffect } from 'react';
import BoardView from '../board/BoardView';
import ControlSheet from './ControlSheet';
import DiceRoller, { DICE_IMAGES } from './DiceRoller';
import GameOver from './GameOver';
import MuteButton from './MuteButton';
import OutcomeDie from './OutcomeDie';
import OutcomeModal from './OutcomeModal';
import PromptModal from './PromptModal';
import ScorePanel from './ScorePanel';
import SquareModal from './SquareModal';
import { activePlayer } from '../../engine/selectors';
import { preloadImages } from '../../data/assets';
import { useGameStore } from '../../store/gameStore';
import { useCardReady, useOutcomeReady, useTurnDriver } from './useTurnDriver';

/**
 * Phases that put a card over the bottom of the screen. Nothing is blurred or
 * dimmed while one is up, so the board has to lift the focused square out from
 * behind the card instead.
 */
const CARD_PHASES = new Set(['landed', 'note', 'battle', 'prompt', 'outcome']);

export default function GameScreen() {
  const state = useGameStore((s) => s.state);
  useTurnDriver();
  // Gates the card and the camera together, so the square is never lifted out
  // from behind a card that has not appeared yet.
  const cardReady = useCardReady();
  const outcomeReady = useOutcomeReady();

  // Fetch the roll animation now so the first roll of the session plays
  // instead of showing an empty frame while it downloads.
  useEffect(() => preloadImages(DICE_IMAGES), []);

  if (!state) return null;
  const active = activePlayer(state);
  // Both gates default to true off their own phase, so this is "a card is
  // actually on screen" rather than "a card phase is current".
  const cardUp = cardReady && outcomeReady && CARD_PHASES.has(state.phase.name);

  return (
    <div className="flex h-dvh flex-col bg-crust">
      <header className="flex items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="min-w-0 truncate font-pokemon text-lg text-accent">{active.name}'s turn</p>
        <span className="flex shrink-0 items-center gap-2 text-sm text-subtext">
          Turn {state.turnNumber}
          <MuteButton />
        </span>
      </header>

      <div className="relative min-h-0 flex-1">
        <BoardView
          players={state.players}
          activeId={active.id}
          focusSquare={active.square}
          anchorY={cardUp ? 0.32 : 0.5}
        />
        <ScorePanel players={state.players} activeId={active.id} />
      </div>

      <ControlSheet />
      <DiceRoller />
      {cardReady && <SquareModal />}
      <PromptModal />
      {state.phase.name === 'outcome' && state.phase.face !== null && !outcomeReady && (
        <OutcomeDie face={state.phase.face} />
      )}
      {outcomeReady && <OutcomeModal />}
      <GameOver />
    </div>
  );
}
