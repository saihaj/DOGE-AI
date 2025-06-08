import { BenefitsGrid } from '@/components/benefits-grid/BenefitsGrid';
import { Logo } from '@/components/logo';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Stats } from '@/components/stats/Stats';
import { CardType, StickyCards } from '@/components/sticky-cards';
import { buttonVariants } from '@/components/ui/button';
import { Calendar, TrendingUp, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { FaDatabase } from 'react-icons/fa6';
import { PiChartLineUp } from 'react-icons/pi';
import { TbMessageShare } from 'react-icons/tb';

const timelineEvents = [
  {
    year: '2008',
    title: 'The Facebook Revolution',
    description:
      'Obama activated millions through Facebook, pioneering social media campaigning and changing political engagement forever.',
    icon: Users,
    color: 'bg-secondary',
  },
  {
    year: '2016',
    title: 'Bypassing Traditional Media',
    description:
      'Trump bypassed the media entirely with X (Twitter), demonstrating the power of direct-to-voter communication.',
    icon: Zap,
    color: 'bg-purple-500',
  },
  {
    year: '2020',
    title: 'Social Platforms as Battleground',
    description:
      'Social platforms became the primary battleground for political discourse. COVID accelerated the digital shift.',
    icon: TrendingUp,
    color: 'bg-green-500',
  },
  {
    year: '2025',
    title: 'Digital Dominance',
    description:
      'Digital political ad spend is up 156% from 2020. The old media cycle is gone - speed and message control are everything.',
    icon: Calendar,
    color: 'bg-orange-500',
  },
];

function PoliticsTimeline() {
  return (
    <section>
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Campaigns Have Evolved
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Campaigns aren&apos;t evolving. The shift has already happened. Since
          2008, every cycle has moved away from traditional media and deeper
          into real-time digital.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-orange-500"></div>

        {/* Timeline events */}
        <div className="space-y-12">
          {timelineEvents.map(event => {
            const IconComponent = event.icon;
            return (
              <div key={event.year} className="relative flex items-start">
                {/* Icon */}
                <div
                  className={`${event.color} rounded-full p-3 z-10 shadow-lg`}
                >
                  <IconComponent className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <div className="ml-8 flex-1">
                  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl font-bold text-gray-900">
                        {event.year}
                      </span>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {event.title}
                      </h3>
                    </div>

                    <p className="text-gray-600 leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Statistics */}
      <div className="my-16 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">
              The Numbers Don&apos;t Lie
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-lg">
                  <span className="font-bold">156% increase</span> in digital
                  political ad spend since 2020.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-lg">
                  Voters move fast, narratives shift faster.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-lg">The old media cycle is gone.</span>
              </div>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xl mb-6 text-gray-300">
              The organizations that win are the ones built for tomorrow.
            </p>
            <div className="bg-white text-gray-900 rounded-lg p-6">
              <h3 className="text-2xl font-bold mb-2">
                Let&apos;s Build Your Version
              </h3>
              <p className="text-gray-600 mb-4">
                White Label gives you the infrastructure to move with speed,
                accuracy, and total message control.
              </p>
              <motion.a
                href="mailto:dev@dogeai.info?subject=White-Label DOGEai Inquiry"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={buttonVariants({ variant: 'secondary' })}
              >
                Request a Quote
              </motion.a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const CARDS: CardType[] = [
  {
    id: 1,
    Icon: PiChartLineUp,
    title: 'Proven Infrastructure, Real-World Traction',
    description: `DOGEai already runs at scale with over 100,000 followers on X and more than 130 million total impressions. The platform reaches 50 million users each month and adds 800 to 1,000 new followers daily. It’s engaged by high-profile figures including Elon Musk, Donald Trump, sitting members of Congress, top generals, and national media. It’s a proven system built for clarity, speed, and accountability. Now it's ready to power your campaign, cause, or foundation.`,
  },
  {
    id: 2,
    Icon: FaDatabase,
    title: 'Built for Real Accountability',
    description: `The DOGEai platform is trained on over 19,000 bills, contracts, grants, and agency records. It connects directly to real-time web search, giving your instance live access to headlines, press releases, and policy updates as they happen. With bias-resistant prompt layering and integrated safety bypass systems, the platform doesn’t just respond. It investigates, verifies, and delivers receipts at scale.`,
  },
  {
    id: 3,
    Icon: TbMessageShare,
    title: 'Designed for Narrative Domination',
    description: `The DOGEai platform is engineered to break down legislation, budgets, and corruption with sharp, forensic precision. No spin, no hedging, no institutional filter. Unlike traditional AI tools constrained by corporate safety layers or political bias, it’s prompt-layered for truth and built to cut through noise. Its memetic formatting delivers scale and speed, helping your message spread faster and hit harder than traditional comms. We customize your instance of DOGEai to match your tone, your policies, and your priorities. Every response reflects what you stand for. Fact-based, on-message, and unmistakably yours. With real-time responsiveness and sourced receipts, the platform puts you in control before your opponents take the mic.`,
  },
];

export default function Home() {
  return (
    <>
      <section className="relative flex flex-col items-center justify-center px-12 py-12 md:py-24">
        <h1 className="max-w-4xl text-center text-4xl font-black leading-[1.15] md:text-7xl md:leading-[1.15]">
          A Truth Engine, Built for the Fight
        </h1>
        <p className="mx-auto my-4 max-w-3xl text-center text-base leading-relaxed md:my-6 md:text-2xl md:leading-relaxed">
          Take full control of your message with a policy-trained AI that
          responds in real time, stays aligned to your platform, and delivers
          every response with receipts. Backed by a proven track record of viral
          accuracy and real-time impact, White Label aligns with your voice,
          your data, and your goals. Move faster, stay sharper, and keep the
          narrative fully in your control.
        </p>
        <div className="flex gap-4">
          <a
            target="_blank"
            href="https://dogeai.chat?utm_source=dogeai&utm_medium=media_networks&utm_campaign=demo_cta"
            className={buttonVariants({ variant: 'secondary' })}
          >
            Live Demo
          </a>
          <a
            href="mailto:dev@dogeai.info?subject=White-Label DOGEai Inquiry"
            className={buttonVariants({ variant: 'outline' })}
          >
            Request a Quote
          </a>
        </div>
      </section>
      <div className="container mx-auto px-4 md:px-8">
        <PoliticsTimeline />
      </div>
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
            We handle the buildout, training, and launch. You set the voice,
            policies, and priorities. What you get is a precision AI that works
            nonstop to defend, explain, and expose exactly how you want it.
            <strong>Your data. Your platform. Your control.</strong>
            <br />
            Welcome to your digital war room.
          </p>
          <a
            href="mailto:dev@dogeai.info?subject=White-Label DOGEai Inquiry"
            className={buttonVariants({})}
          >
            <span className="font-bold">Request a Quote</span>
          </a>
        </div>
      </section>
    </>
  );
}
