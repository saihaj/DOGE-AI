import React, { ReactNode } from 'react';
import { motion } from 'motion/react';
import { FlipNavbar } from './FlipNav';

export const ExpandableNavBar = ({ children }: { children?: ReactNode }) => {
  return (
    <>
      {/* <div className="bg-theme-blue pt-2">
        <Announcement />
      </div> */}
      <FlipNavbar />
      <motion.main layout>
        <div className="bg-white">{children}</div>
      </motion.main>
    </>
  );
};
