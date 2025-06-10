import { BenefitsGrid } from '@/components/benefits-grid/BenefitsGrid';
import { Logo } from '@/components/logo';
import { Seo } from '@/components/seo';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Stats } from '@/components/stats/Stats';
import { CardType, StickyCards } from '@/components/sticky-cards';
import { buttonVariants } from '@/components/ui/button';
import { sendGAEvent } from '@next/third-parties/google';
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
  },
  {
    year: '2016',
    title: 'Bypassing Traditional Media',
    description:
      'Trump bypassed the media entirely with X (Twitter), demonstrating the power of direct-to-voter communication.',
    icon: Zap,
  },
  {
    year: '2020',
    title: 'Social Platforms as Battleground',
    description:
      'Social platforms became the primary battleground for political discourse. COVID accelerated the digital shift.',
    icon: TrendingUp,
  },
  {
    year: '2025',
    title: 'Digital Dominance',
    description:
      'Digital political ad spend is up 156% from 2020. The old media cycle is gone - speed and message control are everything.',
    icon: Calendar,
  },
];

function PoliticsTimeline() {
  return (
    <section>
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 leading-[1.15] md:text-7xl">
          Campaigns Have Evolved
        </h1>
        <p className="text-md md:text-2xl max-w-3xl mx-auto leading-relaxed">
          Campaigns aren&apos;t evolving. The shift has already happened. Since
          2008, every cycle has moved away from traditional media and deeper
          into real-time digital.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-36 md:bottom-20 w-0.5 bg-secondary"></div>

        {/* Timeline events */}
        <div className="space-y-6 md:space-y-10">
          {timelineEvents.map(event => {
            const IconComponent = event.icon;
            return (
              <div key={event.year} className="relative flex items-start">
                {/* Icon */}
                <div className={`bg-secondary rounded-full p-3 z-10 shadow-lg`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <div className="ml-4 md:ml-8 flex-1">
                  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 md:p-6 hover:shadow-lg transition-shadow duration-300">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xl text-gray-900">
                        {event.year}
                      </span>
                      <h3 className="text-xl font-semibold">{event.title}</h3>
                    </div>

                    <p className="text-gray-600 md:text-lg leading-relaxed">
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
      <div className="mt-16 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
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
                onClick={() =>
                  sendGAEvent('event', 'button_clicked', {
                    value: 'Request Quote',
                    screen: 'whitelabel - timeline',
                  })
                }
              >
                Request a Quote
              </motion.a>
            </div>
          </div>
        </div>
      </div>
      <blockquote className="text-2xl italic font-semibold text-center my-10">
        &ldquo;The organizations that win are the ones built for
        tomorrow.&rdquo;
      </blockquote>
    </section>
  );
}

const CARDS: CardType[] = [
  {
    id: 1,
    Icon: PiChartLineUp,
    title: 'Proven Infrastructure. Real-World Traction.',
    description: `DOGEai already runs at scale with over 110,000 followers on X and more than 175 million total impressions. It reaches 50 million users each month and adds 800 to 1,000 new followers daily. The platform drives engagement from high-profile figures including Elon Musk, Donald Trump, sitting members of Congress, top generals, and national media. White Label is built on that same proven system and is ready to power your campaign, cause, foundation, or mission.`,
  },
  {
    id: 2,
    Icon: FaDatabase,
    title: 'Built for Real Accountability',
    description: `White Label is trained on over 19,000 bills, contracts, grants, and agency records. It connects directly to real-time web search, giving your AI live access to headlines, press releases, and policy updates as they happen. With bias-resistant prompt layering and safety bypass systems, the platform doesn’t just respond. It investigates, verifies, and delivers receipts at scale.`,
  },
  {
    id: 3,
    Icon: TbMessageShare,
    title: 'Designed for Narrative Domination',
    description: `White Label breaks down bills, budgets, and misinformation with forensic precision. Unlike traditional AI constrained by corporate safety layers or bias, it’s prompt-layered for truth and built to cut through noise. Memetic formatting drives speed and scale. Each instance is customized to your tone, policies, and priorities. With real-time answers and sourced receipts, you stay in control before opponents take the mic. Fact-based, on-message, and unmistakably yours.`,
    bgColor: 'bg-zinc-300 text-black',
  },
];

export default function Home() {
  return (
    <>
      <Seo
        title="Win the digital fight | DOGEai"
        description="Real-time AI for narrative control. Custom, policy-trained, counters misinformation."
        image="https://dogeai.info/images/white-label-og.jpg"
      />
      <section className="relative flex flex-col items-center justify-center px-6 md:px-12 py-20 md:py-24">
        <h1 className="max-w-4xl text-center text-balance text-4xl font-black leading-[1.15] md:text-7xl md:leading-[1.15]">
          A Truth Engine. Built for the Fight.
        </h1>
        <p className="mx-auto my-4 max-w-3xl text-center leading-relaxed md:my-6 md:text-2xl text-md md:leading-relaxed">
          Take control of your message with White Label, a real-time,
          policy-trained AI that stays on-message, delivers receipts, and aligns
          with your platform. Your voice, your data, your narrative.
        </p>
        <div className="flex gap-4">
          <a
            target="_blank"
            href="https://dogeai.chat?utm_source=dogeai&utm_medium=media_networks&utm_campaign=demo_cta"
            className={buttonVariants({ variant: 'secondary' })}
            onClick={() =>
              sendGAEvent('event', 'button_clicked', {
                value: 'demo',
                screen: 'whitelabel - hero',
              })
            }
          >
            Live Demo
          </a>
          <a
            href="mailto:dev@dogeai.info?subject=White-Label DOGEai Inquiry"
            className={buttonVariants({ variant: 'outline' })}
            onClick={() =>
              sendGAEvent('event', 'button_clicked', {
                value: 'Request Quote',
                screen: 'whitelabel - hero',
              })
            }
          >
            Request a Quote
          </a>
        </div>
      </section>
      <div className="container mx-auto px-4 md:px-8">
        <PoliticsTimeline />
      </div>
      <StickyCards cards={CARDS} />
      <div className="md:space-y-32 space-y-20 bg-zinc-50 py-20 md:py-32">
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
          <p className="mx-auto mb-8 flex gap-2 flex-col max-w-2xl text-pretty text-center text-base leading-relaxed md:text-xl md:leading-relaxed">
            We handle the buildout, training, and launch. You set the voice,
            policies, and priorities. What you get is a precision AI that
            defends, explains, and exposes - nonstop, on-message, and exactly
            how you want it.
            <div className="font-bold text-2xl">
              Your data. Your platform. Your control.
            </div>
            <div>Welcome to your digital war room.</div>
          </p>
          <a
            href="mailto:dev@dogeai.info?subject=White-Label DOGEai Inquiry"
            className={buttonVariants({})}
            onClick={() =>
              sendGAEvent('event', 'button_clicked', {
                value: 'Request Quote',
                screen: 'whitelabel - cta',
              })
            }
          >
            <span className="font-bold">Request a Quote</span>
          </a>
        </div>
      </section>
    </>
  );
}
