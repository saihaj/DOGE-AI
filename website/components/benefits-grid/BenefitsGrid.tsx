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
        <SectionHeading>Why Your Campaign Needs Us?</SectionHeading>
        <SectionSubheading>
          Most bots play it safe. Most AI hedges. Most comms tools react. DOGEai
          preempts, fact-checks, and controls the narrative.
        </SectionSubheading>
      </div>
      <HighlighBlocks />
    </motion.section>
  );
};
