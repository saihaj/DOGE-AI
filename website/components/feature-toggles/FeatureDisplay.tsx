import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import { Button } from '../shared/Button';

export const FeatureDisplay = ({
  selected,
  cardTitle,
  cardSubtitle,
  Component,
}: {
  selected: number;
  cardTitle: string;
  cardSubtitle: string;
  Component: () => JSX.Element;
}) => {
  return (
    <div className="grid h-fit w-full grid-cols-1 overflow-hidden rounded-xl border-2 border-zinc-900 bg-white md:h-96 md:grid-cols-12">
      <div className="col-span-1 flex flex-col justify-between p-8 md:col-span-7 md:p-12">
        <div>
          <AnimatePresence mode="popLayout">
            <motion.div
              initial={{
                opacity: 0,
                y: -25,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: 25,
              }}
              transition={{
                duration: 0.25,
                ease: 'easeInOut',
              }}
              key={selected}
            >
              <h3 className="mb-4 text-3xl font-bold">{cardTitle}</h3>
              <p className="mb-12 max-w-lg text-base leading-relaxed md:text-xl md:leading-relaxed">
                {cardSubtitle}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
        <Button>
          <span className="font-bold">Get started - </span> no CC required
        </Button>
      </div>
      <div className="relative col-span-1 min-h-80 border-l-0 border-t-2 border-zinc-900 bg-zinc-100 shadow-inner shadow-zinc-500 md:col-span-5 md:border-l-2 md:border-t-0">
        <AnimatePresence mode="popLayout">
          <motion.div
            initial={{
              opacity: 0,
              y: 50,
              x: 50,
            }}
            animate={{
              opacity: 1,
              y: 0,
              x: 0,
            }}
            exit={{
              opacity: 0,
              y: 50,
              x: 50,
            }}
            transition={{
              duration: 0.25,
              ease: 'easeInOut',
            }}
            key={selected}
            className="pointer-events-none absolute bottom-0 left-8 right-0 top-8 overflow-hidden rounded-tl-2xl border-l-2 border-t-2 border-zinc-900 bg-white shadow-2xl"
          >
            <Component />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
