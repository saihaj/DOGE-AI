import { motion } from 'motion/react';
import { useState } from 'react';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import useMeasure from 'react-use-measure';
import { BREAKPOINTS, CARD_SIZE, posts } from './data';
import { Post } from './Post';

export const BlogCarousel = () => {
  const [ref, { width }] = useMeasure();
  const [offset, setOffset] = useState(0);

  const CARD_BUFFER =
    width > BREAKPOINTS.lg ? 3 : width > BREAKPOINTS.sm ? 2 : 1;

  const CAN_SHIFT_LEFT = offset < 0;

  const CAN_SHIFT_RIGHT =
    Math.abs(offset) < CARD_SIZE * (posts.length - CARD_BUFFER);

  const shiftLeft = () => {
    if (!CAN_SHIFT_LEFT) {
      return;
    }
    setOffset(pv => (pv += CARD_SIZE));
  };

  const shiftRight = () => {
    if (!CAN_SHIFT_RIGHT) {
      return;
    }
    setOffset(pv => (pv -= CARD_SIZE));
  };

  return (
    <section ref={ref}>
      <div className="relative overflow-hidden px-2 md:px-4">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-center text-3xl font-medium leading-tight md:text-start md:text-4xl md:leading-tight">
              More from us
            </h2>

            <div className="flex items-center gap-2">
              <button
                className={`rounded-md border border-zinc-900 bg-white p-1.5 text-2xl transition-all ${
                  CAN_SHIFT_LEFT ? 'hover:bg-zinc-200' : 'opacity-30'
                }`}
                disabled={!CAN_SHIFT_LEFT}
                onClick={shiftLeft}
              >
                <FiArrowLeft />
              </button>
              <button
                className={`rounded-md border border-zinc-900 bg-white p-1.5 text-2xl transition-all ${
                  CAN_SHIFT_RIGHT ? 'hover:bg-zinc-200' : 'opacity-30'
                }`}
                disabled={!CAN_SHIFT_RIGHT}
                onClick={shiftRight}
              >
                <FiArrowRight />
              </button>
            </div>
          </div>
          <motion.div
            animate={{
              x: offset,
            }}
            transition={{
              ease: 'easeInOut',
            }}
            className="flex"
          >
            {posts.map(post => {
              return <Post key={post.id} {...post} />;
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
