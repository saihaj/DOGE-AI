import React from 'react';
import { OPTIONS } from './options';
import { AnimatePresence } from 'motion/react';

export const Users = ({ selected }: { selected: number }) => {
  const { Content } = OPTIONS[selected];

  return (
    <div className="w-full translate-y-2 rounded-lg bg-zinc-900">
      <AnimatePresence mode="wait">
        <Content key={selected} />
      </AnimatePresence>
    </div>
  );
};
