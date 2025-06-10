import React from 'react';
import { motion } from 'motion/react';
import { HighlighBlocks } from './HighlighBlocks';
import { SectionHeading } from '../shared/SectionHeading';
import { SectionSubheading } from '../shared/SectionSubheading';

export const BenefitsGrid = () => {
  return (
    <motion.section
      transition={{
        staggerChildren: 0.1,
      }}
      initial="initial"
      whileInView="whileInView"
      className="relative mx-auto grid max-w-6xl grid-cols-3 gap-4 px-2 md:px-4"
    >
      <div className="col-span-3">
        <SectionHeading>Why White Label Belongs in Your Stack</SectionHeading>
        <SectionSubheading>
          Most tools play it safe. White Label doesn’t. It preempts, verifies,
          and holds the line so you control the narrative before it’s even
          written.
        </SectionSubheading>
      </div>
      <HighlighBlocks />
    </motion.section>
  );
};
