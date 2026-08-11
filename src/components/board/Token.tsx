import { motion } from 'motion/react';
import { getStarter } from '../../data/starters';
import type { Player } from '../../engine/types';

interface TokenProps {
  player: Player;
  x: number;
  y: number;
  active: boolean;
}

export default function Token({ player, x, y, active }: TokenProps) {
  const starter = getStarter(player.starter);
  return (
    <motion.div
      aria-label={`${player.name} on square ${player.square}`}
      data-active={String(active)}
      className="absolute size-[7%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-crust bg-contain bg-center bg-no-repeat ring-2 data-[active=true]:ring-accent data-[active=false]:ring-surface1"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        backgroundImage: `url(${active ? starter.animated : starter.sprite})`,
      }}
      animate={{ left: `${x}%`, top: `${y}%` }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
    />
  );
}
