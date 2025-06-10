import { cn } from '@/lib/utils';
import { IconType } from 'react-icons';

export type CardType = {
  id: number;
  Icon: IconType;
  title: string;
  description: string;
  bgColor?: string;
};

export const StickyCards = ({ cards }: { cards: CardType[] }) => {
  return (
    <>
      <div className="relative">
        {cards.map((c, idx) => (
          <Card key={c.id} card={c} position={idx + 1} />
        ))}
      </div>
    </>
  );
};

const Card = ({ position, card }: { position: number; card: CardType }) => {
  const isOddCard = position % 2;

  return (
    <div
      style={{
        height: CARD_HEIGHT,
      }}
      className={cn(
        'flex w-full origin-top flex-col items-center justify-center px-4',
        card.bgColor
          ? card.bgColor
          : isOddCard
            ? 'bg-primary text-white'
            : 'bg-white text-black',
      )}
    >
      <card.Icon className="mb-4 text-6xl" />
      <h3 className="mb-6 text-center text-balance max-w-5xl text-3xl font-semibold md:text-5xl">
        {card.title}
      </h3>
      <p className="mb-8 max-w-3xl text-center text-md md:text-lg">
        {card.description}
      </p>
    </div>
  );
};

const CARD_HEIGHT = 500;
