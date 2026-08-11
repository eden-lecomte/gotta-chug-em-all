import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { getStarter } from '../../data/starters';
import type { Player } from '../../engine/types';

/** Beers shown for one round of drinks. Beyond this the stack stops growing. */
const MAX_BEERS = 6;

/** How long a beer takes to gather beside the row. */
const ARRIVE_MS = 900;

/** How long the flight across the row to the drink count takes. */
const DELIVER_MS = 620;

/**
 * How far the beer nearest the row must travel to reach the drink count, and how
 * much further each one behind it has to go to land on the same spot.
 *
 * Measured against the row: the stack gathers just off its left edge, and the
 * count sits at the far right of its 12rem width.
 */
const DELIVER_PX = 190;
const STACK_STEP_PX = 16;

interface ScorePanelProps {
  players: readonly Player[];
  activeId: string;
}

/**
 * Turn order and running totals, parked in the top corner.
 *
 * Seat order is turn order, so the list is simply the players as the engine
 * holds them, with the active seat marked.
 */
export default function ScorePanel({ players, activeId }: ScorePanelProps) {
  return (
    // An overlay rather than part of the column: it hangs in the board's top
    // corner and grows downwards, so adding players never squeezes the board.
    // Nothing clips here — a scroll container would cut the active row's ring
    // off and swallow the beers arriving from the left — and eight rows is the
    // lobby's cap, which fits.
    <ol className="absolute right-2 top-2 z-20 flex w-48 flex-col gap-1.5 text-sm">
      {players.map((player) => (
        <ScoreRow key={player.id} player={player} active={player.id === activeId} />
      ))}
    </ol>
  );
}

function ScoreRow({ player, active }: { player: Player; active: boolean }) {
  const beers = useDrinkBursts(player.drinks);

  return (
    <li
      aria-label={`${player.name} has ${player.drinks} drinks`}
      data-active={String(active)}
      className="relative flex items-center gap-2 rounded-lg bg-mantle/90 px-2.5 py-1.5 shadow-lg data-[active=true]:ring-2 data-[active=true]:ring-accent"
    >
      <img src={getStarter(player.starter).sprite} alt="" className="size-7 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{player.name}</span>

      <motion.span
        // The number is what the beers are flying into, so it reacts too.
        key={player.drinks}
        initial={{ scale: 1.6, color: 'var(--color-red)' }}
        animate={{ scale: 1, color: 'var(--color-yellow)' }}
        transition={{ type: 'spring', damping: 14, stiffness: 300 }}
        className="font-pokemon text-xl"
      >
        {player.drinks}
      </motion.span>

      {/*
        The stack gathers clear of the row, outside it to the left, so it is
        never mistaken for part of the name slot. Each beer arrives from further
        left, then slides right into the card on its way out — drinks handed
        over, rather than decoration sitting next to a number.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-full top-1/2 mr-2 flex -translate-y-1/2 -space-x-2"
      >
        <AnimatePresence>
          {beers.map((beer) => (
            <motion.span
              key={beer.id}
              className="text-2xl drop-shadow"
              initial={{ x: -44, opacity: 0, scale: 0.5 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{
                // Each beer behind the front one starts further left, so it
                // travels further: they converge on the count rather than
                // arriving as a spread-out line.
                x: DELIVER_PX + (beers.length - 1 - beer.index) * STACK_STEP_PX,
                opacity: 0,
                scale: 0.5,
                transition: {
                  x: { duration: DELIVER_MS / 1000, ease: 'easeIn' },
                  scale: { duration: DELIVER_MS / 1000, ease: 'easeIn' },
                  // Held solid for the crossing and snuffed out on arrival,
                  // rather than fading away over open board.
                  opacity: { duration: 0.12, delay: DELIVER_MS / 1000 - 0.12 },
                },
              }}
              transition={{ duration: ARRIVE_MS / 1000, delay: beer.index * 0.09, ease: 'easeOut' }}
            >
              🍺
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </li>
  );
}

interface Beer {
  readonly id: string;
  readonly index: number;
}

/**
 * One beer per drink just added to this player, cleared once they have flown in.
 *
 * The engine reports totals, not events, so the round is the difference from the
 * last total this row rendered.
 */
function useDrinkBursts(drinks: number): readonly Beer[] {
  const previous = useRef(drinks);
  const [beers, setBeers] = useState<readonly Beer[]>([]);

  useEffect(() => {
    const added = drinks - previous.current;
    previous.current = drinks;
    if (added <= 0) return;

    const round = `${drinks}`;
    setBeers(
      Array.from({ length: Math.min(added, MAX_BEERS) }, (_, index) => ({
        id: `${round}-${index}`,
        index,
      })),
    );
    // Removing them is what starts the flight to the count, so hold until the
    // whole stack has gathered — AnimatePresence keeps them mounted for the
    // exit itself.
    const timer = setTimeout(() => setBeers([]), ARRIVE_MS + MAX_BEERS * 90);
    return () => clearTimeout(timer);
  }, [drinks]);

  return beers;
}
