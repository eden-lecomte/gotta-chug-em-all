import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  actions: ReactNode;
}

export default function Modal({ title, children, actions }: ModalProps) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-crust/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:place-items-center">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-base p-5 shadow-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      >
        <h2 className="mb-3 font-pokemon text-xl text-accent">{title}</h2>
        <div className="mb-5 flex flex-col gap-3 text-text">{children}</div>
        <div className="flex gap-2">{actions}</div>
      </motion.div>
    </div>
  );
}
