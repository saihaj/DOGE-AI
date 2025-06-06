import { BenefitsGrid } from '@/components/benefits-grid/BenefitsGrid';
import { EmailCapture } from '@/components/email-capture/EmailCapture';
import { Footer } from '@/components/footer/Footer';
import { Hero } from '@/components/hero/Hero';
import { Logo } from '@/components/logo';
import { ExpandableNavBar } from '@/components/navigation/ExpandableNavBar';
import { NAV_LINKS } from '@/components/navigation/constants';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Stats } from '@/components/stats/Stats';
import { Supports } from '@/components/supports/Supports';
import { Button } from '@/components/ui/button';
import { motion, MotionValue, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { IconType } from 'react-icons';
import { FaShieldAlt } from 'react-icons/fa';
import { FaClock } from 'react-icons/fa6';
import { GiPlatform } from 'react-icons/gi';
import { GrIntegration } from 'react-icons/gr';
import { IoIosPeople } from 'react-icons/io';

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
        background: isOddCard ? 'black' : 'white',
        color: isOddCard ? 'white' : 'black',
      }}
      className="sticky top-0 flex w-full origin-top flex-col items-center justify-center px-4"
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
    Icon: GiPlatform,
    title: 'Your Policy Platform',
    description:
      'Your version of DOGEai speaks directly to your policy platform, defending your record and legislation with sourced facts that voters can trust.',
  },
  {
    id: 2,
    Icon: FaShieldAlt,
    title: 'Misinformation Defense',
    description: `Refute misinformation before it spreads. Counterattack opponents' claims with hard data and timestamps. Package every response in high-engagement, social-friendly language.`,
  },
  {
    id: 3,
    Icon: FaClock,
    title: '24/7 Engagement',
    description: `An autonomous surrogate that never sleeps, never goes off message, and answers instantly, factually, and with receipts. Always on duty while your team rests.`,
  },
  {
    id: 4,
    Icon: IoIosPeople,
    title: 'Voter Interaction Hub',
    description: `Voters can ask where you stand on issues, learn what's in bills you sponsored, see facts behind controversies, and get instant comparisons between you and opponents.`,
  },
  {
    id: 5,
    Icon: GrIntegration,
    title: 'Seamless Integration',
    description: `Embeds into your campaign website with your branding, voice, and tone. Trained on your interviews, speeches, and platform docs. No technical expertise needed—our team handles everything.`,
  },
];

export default function Home() {
  return (
    <main className="overflow-hidden">
      <ExpandableNavBar links={NAV_LINKS}>
        <Hero />
      </ExpandableNavBar>
      <StickyCards />
      <div className="space-y-36 bg-zinc-50 pb-24 pt-24 md:pt-32">
        <Stats />
        <Supports />
        <BenefitsGrid />
      </div>
      <EmailCapture />
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
