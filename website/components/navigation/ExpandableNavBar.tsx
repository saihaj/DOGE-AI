import React, { ReactNode, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { FiMenu } from 'react-icons/fi';
import { Logo } from './Logo';
import { DesktopLinks } from './DesktopLinks';
import { MobileLinks } from './MobileLinks';
import { Announcement } from './Announcement';
import { Button } from '../shared/Button';
import { FlipNavbar } from './FlipNav';

type LinkType = {
  title: string;
  sublinks: { title: string; href: string }[];
};

export const ExpandableNavBar = ({
  children,
  links,
}: {
  children?: ReactNode;
  links: LinkType[];
}) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const activeSublinks = useMemo(() => {
    if (!hovered) return [];
    const link = links.find(l => l.title === hovered);

    return link ? link.sublinks : [];
  }, [hovered, links]);

  return (
    <>
      <div className="bg-theme-blue pt-2">
        <Announcement />
        <FlipNavbar />
        {/* <nav
          onMouseLeave={() => setHovered(null)}

        >
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <Logo />
              <DesktopLinks
                links={links}
                setHovered={setHovered}
                hovered={hovered}
                activeSublinks={activeSublinks}
              />
            </div>
            <Button className="hidden md:block" intent="secondary" size="small">
              <span className="font-bold">Get started - </span> no CC required
            </Button>
            <button
              onClick={() => setMobileNavOpen(pv => !pv)}
              className="mt-0.5 block text-2xl md:hidden"
            >
              <FiMenu />
            </button>
          </div>
          <MobileLinks links={links} open={mobileNavOpen} />
        </nav> */}
      </div>
      <motion.main layout>
        <div className="bg-white">{children}</div>
      </motion.main>
    </>
  );
};
