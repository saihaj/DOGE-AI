import { BenefitsGrid } from '@/components/benefits-grid/BenefitsGrid';
import { HighlightBlock } from '@/components/benefits-grid/HighlighBlocks';
import { Logo } from '@/components/logo';
import { Seo } from '@/components/seo';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { SectionSubheading } from '@/components/shared/SectionSubheading';
import { Stats } from '@/components/stats/Stats';
import { CardType, StickyCards } from '@/components/sticky-cards';
import { buttonVariants } from '@/components/ui/button';
import { sendGAEvent } from '@next/third-parties/google';
import { Calendar, TrendingUp, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import {
  FaBolt,
  FaBullhorn,
  FaCog,
  FaEye,
  FaFolder,
  FaHandshake,
  FaLightbulb,
  FaShieldAlt,
} from 'react-icons/fa';
import { FaBrain, FaEyeSlash } from 'react-icons/fa6';
import { IoIosPeople } from 'react-icons/io';

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
          Since 2008, every cycle has moved away from traditional media and
          deeper into real-time digital.
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
    Icon: FaBullhorn,
    title: 'Candidates & Policymakers',
    description: `White Label is built for leaders shaping policy, power, and public opinion. Amplify your message, automatically respond to news, posts, and opponents, and stay ahead without a comms team on call. The platform leverages proven infrastructure to drive engagement and maintain narrative control, tailored to your campaign or office.`,
  },
  {
    id: 2,
    Icon: FaLightbulb,
    title: 'Thought Leaders & Creators',
    description: `Focus on your work, not the wording. White Label empowers you to post and respond with precision, connecting to real-time web data to keep your voice authentic and impactful. Built on a system trusted by high-profile figures, it’s customized to your tone and priorities, ensuring your narrative resonates without constant oversight.`,
  },
  {
    id: 3,
    Icon: FaHandshake,
    title: 'Mission-Driven Organizations',
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
          Own your narrative, at speed.
        </h1>
        <p className="mx-auto my-4 max-w-3xl text-center leading-relaxed md:my-6 md:text-2xl text-md md:leading-relaxed">
          White label is an autonomous communication tool for individuals or
          organizations who want to control their truth at scale.
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

      <motion.section
        transition={{
          staggerChildren: 0.1,
        }}
        initial="initial"
        whileInView="whileInView"
        className="relative mx-auto grid max-w-6xl grid-cols-3 gap-4 px-2 md:px-4 py-20 md:py-32"
      >
        <div className="col-span-3">
          <SectionHeading>White Label at a Glance</SectionHeading>
          <SectionSubheading>
            White label is an AI-powered engine trained on your tone, platform,
            and policy that tweets real-time truths directly to your audience.
            It’s not a chatbot. It’s not an assistant. It&apos;s your public
            voice, automated, posting or commenting under your audience&apos;s
            posts.
          </SectionSubheading>
        </div>
        <HighlightBlock
          Icon={FaBolt}
          iconClassName="text-red-500"
          title="Real-Time Engagement"
          subtitle="Stay ahead with instant, on-brand posts that capture every moment."
        />
        <HighlightBlock
          Icon={FaShieldAlt}
          iconClassName="text-pink-500"
          title="Policy-Aligned tone"
          subtitle={`Reflects your goals and values with precise, consistent messaging.`}
        />
        <HighlightBlock
          Icon={FaCog}
          iconClassName="text-blue-500"
          title="Autonomous Operation"
          subtitle={`Streamlines workflows, reducing the need for large teams.`}
        />
        <HighlightBlock
          Icon={FaFolder}
          iconClassName="text-orange-500"
          title="Trained on Your Data"
          subtitle={`Informed by your bills, grants, hearings, contracts, and more.`}
        />
        <HighlightBlock
          Icon={FaEyeSlash}
          iconClassName="text-zinc-500"
          title="Image Protection"
          subtitle={`Detects misinformation and restores truth to safeguard your reputation.`}
        />
        <HighlightBlock
          Icon={IoIosPeople}
          iconClassName="text-green-500"
          title="Supporter Interaction Engine"
          subtitle="Empowers voters, donors, and advocates to ask questions, explore your stance, understand your track record, and compare positions in real time."
        />
      </motion.section>

      <StickyCards cards={CARDS} />

      <div className="pt-20 md:pt-32 container mx-auto px-4 md:px-8">
        <PoliticsTimeline />
      </div>
      <div className="md:space-y-32 space-y-20 bg-zinc-50 py-20 md:py-32">
        <motion.section
          transition={{
            staggerChildren: 0.1,
          }}
          initial="initial"
          whileInView="whileInView"
          className="relative mx-auto grid max-w-6xl grid-cols-3 gap-4 px-2 md:px-4"
        >
          <div className="col-span-3">
            <SectionHeading>How It Works</SectionHeading>
            <SectionSubheading>
              Train once, engage endlessly with automated, on-brand posts.
            </SectionSubheading>
          </div>
          <HighlightBlock
            Icon={FaBrain}
            iconClassName="text-red-500"
            title="Train"
            subtitle="Input your tone, policies, and key messages to shape your AI voice."
          />
          <HighlightBlock
            Icon={FaEye}
            iconClassName="text-gray-500"
            title="Trigger"
            subtitle={`AI monitors real-time political news and data for relevant moments.`}
          />
          <HighlightBlock
            Icon={FaBullhorn}
            iconClassName="text-green-500"
            title="Post"
            subtitle={`Publishes authentic, campaign-aligned content in your voice instantly.`}
          />
        </motion.section>
        <section>
          <div className="col-span-3">
            <SectionHeading>
              Proven Infrastructure. Real-World Traction.
            </SectionHeading>
            <SectionSubheading>
              White Label, the technology powering DOGEai, delivers unmatched
              impact. Drives impressions, followers, and engagement from leaders
              like Elon Musk, Donald Trump, and members of Congress.
            </SectionSubheading>
          </div>
          <Stats />
        </section>
        <BenefitsGrid />
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
          <SectionHeading>Your voice. Weaponized.</SectionHeading>

          <p className="mx-auto mb-8 flex gap-2 flex-col max-w-2xl text-pretty text-center text-base leading-relaxed md:text-xl md:leading-relaxed">
            You set the tone, policies, and priorities. We handle the buildout,
            training and launch.
            <div className="font-bold text-2xl">Let’s win the narrative.</div>
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
