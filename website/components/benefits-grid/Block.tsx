import React from 'react';
import { twMerge } from 'tailwind-merge';
import { MotionProps, motion } from 'motion/react';

type BlockProps = {
  className?: string;
} & MotionProps;

export const Block = ({ className, ...rest }: BlockProps) => {
  return (
    <motion.div
      variants={{
        initial: {
          y: 6,
          boxShadow: '0px 0px 0px rgb(24, 24, 27)',
        },
        whileInView: {
          y: 0,
          boxShadow: '0px 6px 0px rgb(24, 24, 27)',
        },
      }}
      className={twMerge(
        'col-span-1 rounded-lg border-2 border-zinc-900 bg-white p-6',
        className,
      )}
      {...rest}
    />
  );
};
