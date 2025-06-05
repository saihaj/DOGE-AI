import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LinkType } from './constants';

export const MobileLinks = ({
  links,
  open,
}: {
  links: LinkType[];
  open: boolean;
}) => {
  return (
    <AnimatePresence mode="popLayout">
      {open && (
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          className="grid grid-cols-2 gap-6 py-6 md:hidden"
        >
          {links.map(l => {
            return (
              <div key={l.title} className="space-y-1.5">
                <span className="text-md block font-semibold">{l.title}</span>
                {l.sublinks.map(sl => (
                  <a
                    className="text-md block text-zinc-600"
                    href={sl.href}
                    key={sl.title}
                  >
                    {sl.title}
                  </a>
                ))}
              </div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
