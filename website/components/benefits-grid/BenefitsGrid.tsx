import React from 'react';
import { motion } from 'motion/react';
import { CollaborateBlock } from './CollaborateBlock';
import { HighlighBlocks } from './HighlighBlocks';
import { SectionHeading } from '../shared/SectionHeading';
import { SectionSubheading } from '../shared/SectionSubheading';
import { Button } from '../shared/Button';

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
        <SectionHeading>The clear benefits of X</SectionHeading>
        <SectionSubheading>
          Features are good, benefits are even better! Here's a made up list for
          reference.
        </SectionSubheading>
      </div>
      <CollaborateBlock />
      <HighlighBlocks />
      <div className="col-span-3 mt-6 flex justify-center">
        <Button intent="outline">
          <span className="font-bold">Get started - </span> no CC required
        </Button>
      </div>
    </motion.section>
  );
};
