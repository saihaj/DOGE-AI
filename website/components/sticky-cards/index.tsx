import { cn } from '@/lib/utils';
import { motion, MotionValue, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { IconType } from 'react-icons';

export type CardType = {
  id: number;
  Icon: IconType;
  title: string;
  description: string;
};

export const StickyCards = ({ cards }: { cards: CardType[] }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  return (
    <>
      <div ref={ref} className="relative">
        {cards.map((c, idx) => (
          <Card
            key={c.id}
            card={c}
            length={cards.length}
            scrollYProgress={scrollYProgress}
            position={idx + 1}
          />
        ))}
      </div>
    </>
  );
};

const Card = ({
  position,
  card,
  length,
  scrollYProgress,
}: {
  position: number;
  card: CardType;
  length: number;
  scrollYProgress: MotionValue;
}) => {
  const scaleFromPct = (position - 1) / length;
  const y = useTransform(scrollYProgress, [scaleFromPct, 1], [0, -CARD_HEIGHT]);

  const isOddCard = position % 2;

  return (
    <motion.div
      style={{
        height: CARD_HEIGHT,
        y: position === length ? undefined : y,
        color: isOddCard ? 'white' : 'black',
      }}
      className={cn(
        'sticky top-0 flex w-full origin-top flex-col items-center justify-center px-4',
        isOddCard ? 'bg-primary' : 'bg-white',
      )}
    >
      <card.Icon className="mb-4 text-4xl" />
      <h3 className="mb-6 text-center text-balance max-w-5xl text-4xl font-semibold md:text-6xl">
        {card.title}
      </h3>
      <p className="mb-8 max-w-lg text-center text-sm md:text-base">
        {card.description}
      </p>
    </motion.div>
  );
};

const CARD_HEIGHT = 500;
