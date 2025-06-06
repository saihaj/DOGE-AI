import { BenefitsGrid } from '@/components/benefits-grid/BenefitsGrid';
import { Footer } from '@/components/footer/Footer';
import { Hero } from '@/components/hero/Hero';
import { Logo } from '@/components/logo';
import { ExpandableNavBar } from '@/components/navigation/ExpandableNavBar';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Stats } from '@/components/stats/Stats';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, MotionValue, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { IconType } from 'react-icons';
import { FaDatabase } from 'react-icons/fa6';
import { PiChartLineUp } from 'react-icons/pi';
import { TbMessageShare } from 'react-icons/tb';

const StickyCards = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  return (
    <>
      <div ref={ref} className="relative">
        {CARDS.map((c, idx) => (
          <Card
            key={c.id}
            card={c}
            scrollYProgress={scrollYProgress}
            position={idx + 1}
          />
        ))}
      </div>
    </>
  );
};

interface CardProps {
  position: number;
  card: CardType;
  scrollYProgress: MotionValue;
}

const Card = ({ position, card, scrollYProgress }: CardProps) => {
  const scaleFromPct = (position - 1) / CARDS.length;
  const y = useTransform(scrollYProgress, [scaleFromPct, 1], [0, -CARD_HEIGHT]);

  const isOddCard = position % 2;

  return (
    <motion.div
      style={{
        height: CARD_HEIGHT,
        y: position === CARDS.length ? undefined : y,
        color: isOddCard ? 'white' : 'black',
      }}
      className={cn(
        'sticky top-0 flex w-full origin-top flex-col items-center justify-center px-4',
        isOddCard ? 'bg-primary' : 'bg-white',
      )}
    >
      <card.Icon className="mb-4 text-4xl" />
      <h3 className="mb-6 text-center text-4xl font-semibold md:text-6xl">
        {card.title}
      </h3>
      <p className="mb-8 max-w-lg text-center text-sm md:text-base">
        {card.description}
      </p>
    </motion.div>
  );
};

const CARD_HEIGHT = 500;

type CardType = {
  id: number;
  Icon: IconType;
  title: string;
  description: string;
};

const CARDS: CardType[] = [
  {
    id: 1,
    Icon: PiChartLineUp,
    title: 'Massive Reach & Engagement',
    description: `Before any white-label customization, DOGEai already delivers 100,000+ followers on X, 130M+ impressions, and engagement from Elon Musk, members of Congress, generals, journalists, and policy influencers. This isn't an experiment—it's a proven force.`,
  },
  {
    id: 2,
    Icon: FaDatabase,
    title: 'Purpose-Built for Accountability',
    description: `Trained on 19,000+ bills, contracts, grants, and agency data. Equipped with real-time web search for live events, headlines, and press releases. Featuring bias-resistant prompt layering and safety bypass systems. It doesn't just respond. It investigates.`,
  },
  {
    id: 3,
    Icon: TbMessageShare,
    title: 'Memetic Impact That Spreads',
    description: `DOGEai earned its reputation by producing sharp, forensic-style breakdowns of legislation, budgets, and corruption—with no spin, no hedging, and no institutional filter. Its memetic formatting spreads faster and hits harder than traditional PR. It shows receipts and moves fast enough to shape the narrative.`,
  },
];

export default function Home() {
  return (
    <main className="overflow-hidden">
      <ExpandableNavBar>
        <Hero />
      </ExpandableNavBar>
      <StickyCards />
      <div className="space-y-36 bg-zinc-50 pb-24 pt-24 md:pt-32">
        <BenefitsGrid />
        <Stats />
      </div>
      <section id="subscribe" className="mx-auto mb-16 md:mb-24">
        <iframe
          src="https://dogeai.substack.com/embed"
          width="100%"
          height="300px"
        ></iframe>
      </section>
      <section className="-mt-8 bg-white px-2 py-24 md:px-4">
        <div className="mx-auto flex max-w-5xl flex-col items-center">
          <Logo className="h-[80px] w-[80px] rounded-full" />
          <SectionHeading>Let's Build Your Version</SectionHeading>
          <p className="mx-auto mb-8 text-center text-base leading-relaxed md:text-xl md:leading-relaxed">
            We'll build, train, and launch your custom DOGEai—all aligned to
            your message, priorities, and policies. You control the voice. We
            provide the engine. Your voters get the truth.{' '}
            <strong>It's time to build your digital war room.</strong>
          </p>
          <Button>
            <span className="font-bold">Get your White-Label DOGEai</span>
          </Button>
        </div>
      </section>
      <Footer />
    </main>
  );
}
