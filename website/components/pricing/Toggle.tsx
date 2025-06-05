import React, { Dispatch, SetStateAction } from 'react';
import { motion } from 'motion/react';

export type ToggleOptionsType = 'monthly' | 'annual';

export const Toggle = ({
  selected,
  setSelected,
}: {
  selected: ToggleOptionsType;
  setSelected: Dispatch<SetStateAction<ToggleOptionsType>>;
}) => {
  return (
    <div className="relative mx-auto mt-3 flex w-fit items-center rounded-full bg-zinc-200">
      <button
        className="relative z-10 flex items-center gap-2 px-3 py-1.5 text-sm font-medium"
        onClick={() => {
          setSelected('monthly');
        }}
      >
        <span className="relative z-10">Monthly</span>
      </button>
      <button
        className="relative z-10 flex items-center gap-2 px-3 py-1.5 text-sm font-medium"
        onClick={() => {
          setSelected('annual');
        }}
      >
        <span className="relative z-10">Annually</span>
      </button>
      <div
        className={`absolute inset-0 z-0 flex ${
          selected === 'annual' ? 'justify-end' : 'justify-start'
        }`}
      >
        <motion.span
          layout
          transition={{ ease: 'easeInOut' }}
          className="h-full w-1/2 rounded-full border border-zinc-900 bg-white"
        />
      </div>
    </div>
  );
};
