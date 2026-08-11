import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Sheet({ open, onClose, title, children }: SheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-30 max-h-[70dvh] overflow-y-auto rounded-t-2xl bg-mantle p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-pokemon text-lg text-accent">{title}</h2>
            <button type="button" onClick={onClose} className="min-h-11 px-3 text-subtext">
              Close
            </button>
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
