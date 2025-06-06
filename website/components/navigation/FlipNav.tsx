import { motion } from 'motion/react';
import { Dispatch, SetStateAction, useState } from 'react';
import { FiMenu, FiArrowRight } from 'react-icons/fi';
import { Logo } from '../logo';
import { buttonVariants } from '../ui/button';
import Link from 'next/link';

export const FlipNavbar = () => {
  return (
    <div className="rounded-t-2xl bg-white  border-b-[1px] border-gray-200">
      <div className="container mx-auto">
        <FlipNav />
      </div>
    </div>
  );
};

const FlipNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <nav className="bg-white p-4 flex items-center justify-between relative">
      <NavLeft />
      <NavRight setIsOpen={setIsOpen} />
      <NavMenu isOpen={isOpen} />
    </nav>
  );
};

const NavLeft = () => {
  return (
    <div className="flex items-center gap-6">
      <Link prefetch href="/">
        <Logo className="h-[50px] w-[50px] rounded-full" />
      </Link>
      <NavLink text="Stories" href="/interactions" />
      <NavLink text="Your DOGEai" href="/media-networks" />
    </div>
  );
};

const NavLink = ({ text, href }: { text: string; href: string }) => {
  return (
    <Link
      prefetch
      href={href}
      rel="nofollow"
      className="hidden lg:block h-[30px] overflow-hidden font-medium"
    >
      <motion.div whileHover={{ y: -30 }}>
        <span className="flex items-center h-[30px] text-gray-500">{text}</span>
        <span className="flex items-center h-[30px] text-secondary">
          {text}
        </span>
      </motion.div>
    </Link>
  );
};

const NavRight = ({
  setIsOpen,
}: {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <div className="flex items-center gap-4">
      <motion.a
        target="_blank"
        href="https://dogeai.chat?utm_source=dogeai&utm_medium=navbar&utm_campaign=try_now"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={buttonVariants({ variant: 'secondary' })}
      >
        Try Now
      </motion.a>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="block lg:hidden text-gray-950 text-2xl"
        onClick={() => setIsOpen(pv => !pv)}
      >
        <FiMenu />
      </motion.button>
    </div>
  );
};

const NavMenu = ({ isOpen }: { isOpen: boolean }) => {
  return (
    <motion.div
      variants={menuVariants}
      initial="closed"
      animate={isOpen ? 'open' : 'closed'}
      className="z-10 absolute p-4 bg-white shadow-lg left-0 right-0 top-full origin-top flex flex-col gap-4"
    >
      <MenuLink text="Stories" href="/interactions" />
      <MenuLink text="Your DOGEai" href="/media-networks" />
    </motion.div>
  );
};

const MenuLink = ({ text, href }: { text: string; href: string }) => {
  return (
    <Link href={href} prefetch>
      <motion.div
        variants={menuLinkVariants}
        className="h-[30px] overflow-hidden font-medium text-lg flex items-start gap-2"
      >
        <motion.span variants={menuLinkArrowVariants}>
          <FiArrowRight className="h-[30px] text-gray-950" />
        </motion.span>
        <motion.div whileHover={{ y: -30 }}>
          <span className="flex items-center h-[30px] text-gray-500">
            {text}
          </span>
          <span className="flex items-center h-[30px] text-secondary">
            {text}
          </span>
        </motion.div>
      </motion.div>
    </Link>
  );
};

const menuVariants = {
  open: {
    scaleY: 1,
    transition: {
      when: 'beforeChildren',
      staggerChildren: 0.1,
    },
  },
  closed: {
    scaleY: 0,
    transition: {
      when: 'afterChildren',
      staggerChildren: 0.1,
    },
  },
};

const menuLinkVariants = {
  open: {
    y: 0,
    opacity: 1,
  },
  closed: {
    y: -10,
    opacity: 0,
  },
};

const menuLinkArrowVariants = {
  open: {
    x: 0,
  },
  closed: {
    x: -4,
  },
};
