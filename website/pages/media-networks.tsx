import { BenefitsGrid } from '@/components/benefits-grid/BenefitsGrid';
import { Logo } from '@/components/logo';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Stats } from '@/components/stats/Stats';
import { CardType, StickyCards } from '@/components/sticky-cards';
import { Button, buttonVariants } from '@/components/ui/button';
import { FaDatabase } from 'react-icons/fa6';
import { PiChartLineUp } from 'react-icons/pi';
import { TbMessageShare } from 'react-icons/tb';

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
    <>
      <section className="relative flex flex-col items-center justify-center px-12 py-12 md:py-24">
        <h1 className="max-w-4xl text-center text-4xl font-black leading-[1.15] md:text-7xl md:leading-[1.15]">
          A Truth Engine, Built for the Fight.
        </h1>
        <p className="mx-auto my-4 max-w-3xl text-center text-base leading-relaxed md:my-6 md:text-2xl md:leading-relaxed">
          This isn&apos;t another polite chatbot. It&apos;s an autonomous
          surrogate that never sleeps, never goes off message, and always
          delivers facts with receipts. The white-label AI solution designed to
          control your narrative in a world of misinformation.
        </p>
        <a
          target="_blank"
          href="https://dogeai.chat?utm_source=dogeai&utm_medium=media_networks&utm_campaign=demo_cta"
          className={buttonVariants({ variant: 'secondary' })}
        >
          Try Demo Today!
        </a>
      </section>
      <StickyCards cards={CARDS} />
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
          <SectionHeading>Let&apos;s Build Your Version</SectionHeading>
          <p className="mx-auto mb-8 text-center text-base leading-relaxed md:text-xl md:leading-relaxed">
            We&apos;ll build, train, and launch your custom DOGEai—all aligned
            to your message, priorities, and policies. You control the voice. We
            provide the engine. Your voters get the truth.{' '}
            <strong>It&apos;s time to build your digital war room.</strong>
          </p>
          <a
            href="mailto:dev@dogeai.info?subject=White-Label DOGEai Inquiry"
            className={buttonVariants({})}
          >
            <span className="font-bold">Get your White-Label DOGEai</span>
          </a>
        </div>
      </section>
    </>
  );
}
