import { HighlightBlock } from '@/components/benefits-grid/HighlighBlocks';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { SectionSubheading } from '@/components/shared/SectionSubheading';
import { CardType, StickyCards } from '@/components/sticky-cards';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import {
  FaAnchor,
  FaClock,
  FaDatabase,
  FaShieldAlt,
  FaTerminal,
} from 'react-icons/fa';
import { FiArrowDown, FiTarget, FiZap } from 'react-icons/fi';
import { TbFocus2, TbTrendingUp } from 'react-icons/tb';

function CongressCard({
  number,
  total,
  senate,
  house,
}: {
  number: number;
  total: number;
  senate: number;
  house: number;
}) {
  return (
    <article className="flex w-full flex-col py-7 px-4 items-center bg-white border rounded-2xl">
      <svg
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        width="70"
        height="70"
        viewBox="0 0 70 70"
        fill="none"
      >
        <path
          opacity="0.2"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16.1124 29.2215C16.1124 28.5551 16.7662 28.1035 17.3905 28.1035H20.132C20.5087 28.1035 20.8188 27.8043 20.8386 27.4291C20.9368 25.5674 21.461 23.7716 22.3674 22.1432C23.5659 19.99 25.372 18.2337 27.5073 17.0152C29.7879 15.7137 32.3771 15.0585 34.9996 15.0585C37.6226 15.0585 40.2122 15.7139 42.4931 17.0159C44.6286 18.2347 46.4349 19.9917 47.6332 22.1455C48.5388 23.7733 49.0624 25.5683 49.1604 27.4292C49.1802 27.8039 49.4898 28.1035 49.8663 28.1035H52.6085C53.2333 28.1035 53.8857 28.5548 53.8857 29.2215V34.5915L37.471 25.3599C36.2639 24.681 34.4928 24.6807 33.2857 25.3599L16.1123 35.022L16.1124 29.2215ZM34.9996 31.255C33.639 31.255 32.5291 32.3599 32.5291 33.7214C32.5291 35.0819 33.6381 36.1959 34.9996 36.1959C36.3616 36.1959 37.47 35.0823 37.47 33.7214C37.47 32.3595 36.3605 31.255 34.9996 31.255ZM21.5822 57.3959H18.758V41.0102H21.5822V57.3959ZM28.6457 41.0102H31.4682V57.3959H28.6457V41.0102ZM38.5318 41.0102H41.3543V57.3959H38.5318V41.0102ZM48.4177 41.0102H51.2403V57.3959H48.4177V41.0102ZM59.3621 63.0469V65.1124H10.6379V63.0469H59.3621Z"
          fill="url(#paint0_linear_13_441)"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M34.9995 35.9389C33.7796 35.9389 32.7861 34.9398 32.7861 33.7214C32.7861 32.503 33.7796 31.5121 34.9995 31.5121C36.2204 31.5121 37.213 32.503 37.213 33.7214C37.213 34.9398 36.2204 35.9389 34.9995 35.9389ZM34.9995 29.5789C32.7163 29.5789 30.8578 31.439 30.8578 33.7215C30.8578 36.004 32.7163 37.864 34.9995 37.864C37.2836 37.864 39.1413 36.004 39.1413 33.7215C39.1413 31.439 37.2836 29.5789 34.9995 29.5789ZM59.105 64.8554H10.8949V63.304H59.1052V64.8554H59.105ZM15.1316 59.5189C15.1316 59.2752 15.3371 59.0722 15.5807 59.0722H54.4198C54.6627 59.0722 54.8682 59.2752 54.8682 59.5189V61.379H15.1316V59.5189ZM19.0151 41.2674H21.3252V57.1391H19.0151V41.2674ZM13.0481 38.66C12.7289 38.8387 12.5625 39.0662 12.5535 39.3424H57.4456C57.4456 38.8668 57.5108 38.5472 56.9518 38.2377L36.6525 26.8173C35.9492 26.4193 34.8079 26.4193 34.1044 26.8173L13.0481 38.66ZM16.3695 29.2215V34.5824L33.1598 25.1358C34.4456 24.4128 36.3122 24.4128 37.5971 25.1358L53.6288 34.1519V29.2215C53.6288 28.7585 53.1626 28.3605 52.6086 28.3605H49.8664C49.3539 28.3605 48.9307 27.9544 48.9039 27.4427C48.5458 20.644 42.4383 15.3156 34.9997 15.3156C27.5609 15.3156 21.4536 20.644 21.0955 27.4427C21.0679 27.9544 20.6455 28.3605 20.1321 28.3605H17.3908C16.8374 28.3605 16.3695 28.7585 16.3695 29.2215ZM37.3877 5.16238C39.3811 5.41746 40.4485 7.47616 43.4894 7.82658C44.8777 7.98086 46.0171 8.01334 47.0309 7.76162C46.2162 8.79314 45.148 9.32122 43.7298 9.45926C40.9245 9.72442 39.6777 8.04204 35.9637 8.72006V5.30042C36.443 5.146 36.9132 5.1054 37.3877 5.16238ZM43.0255 41.2674H46.7464V57.1391H43.0255V41.2674ZM38.7888 41.2674H41.0973V57.1391H38.7888V41.2674ZM33.1395 41.2674H36.8606V57.1391H33.1395V41.2674ZM28.9027 41.2674H31.2112V57.1391H28.9027V41.2674ZM26.9743 41.2674V57.1391H23.2534V41.2674H26.9743ZM50.9832 57.1389H48.6747V41.2674H50.9832V57.1389ZM59.2554 61.379H56.7966V59.5189C56.7966 58.2112 55.7292 57.1389 54.4199 57.1389H52.9116V41.2674H58.4098C58.9426 41.2674 59.3731 40.8369 59.3731 40.309V38.9444C59.3731 37.9535 58.8354 37.0843 57.8964 36.5563L55.5571 35.2404V29.2215C55.5571 27.6863 54.234 26.4274 52.6086 26.4274H50.7509C49.9037 19.3445 43.6591 13.8455 35.9637 13.415V10.6938C39.3993 9.88668 40.5063 11.7271 43.911 11.3761C47.1039 11.0756 49.1793 9.11808 50.2563 5.38974C50.5423 4.39672 49.2649 3.70624 48.5952 4.49626C47.2851 6.0315 46.2259 6.20202 43.711 5.90956C41.1947 5.61486 40.2766 3.59088 37.633 3.25348C36.6152 3.12356 35.5894 3.29408 34.5853 3.7733C34.2482 3.9357 34.0354 4.27688 34.0354 4.64242V13.4148C26.3408 13.8453 20.0945 19.3444 19.249 26.4273H17.3905C15.7644 26.4273 14.442 27.6863 14.442 29.2214V35.6626L12.1019 36.9785C11.1637 37.5064 10.6251 38.3756 10.6251 39.3666V40.3088C10.6251 40.8368 11.0572 41.2673 11.5893 41.2673H17.0867V57.1389H15.5807C14.2689 57.1389 13.2032 58.211 13.2032 59.5189V61.379H10.7446C9.76413 61.379 8.96655 62.175 8.96655 63.1578V65.0584C8.96655 66.025 9.74705 66.7886 10.7446 66.7886H59.2552C60.2511 66.7886 61.0332 66.025 61.0332 65.0584V63.1578C61.0334 62.175 60.235 61.379 59.2554 61.379Z"
          fill="#839EFF"
        />
        <defs>
          <linearGradient
            id="paint0_linear_13_441"
            x1="35"
            y1="15.0585"
            x2="35"
            y2="65.1124"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#839EFF" />
            <stop offset="1" stopColor="#4E5F99" />
          </linearGradient>
        </defs>
      </svg>

      <h2 className="font-bold text-2xl md:text-3xl">
        {number}
        <sup>th</sup> Congress
      </h2>

      <div className="my-5 border-t w-full" />

      <dl className="flex gap-5 w-full">
        <div className="flex flex-col items-center w-full">
          <h4 className="text-secondary text-lg">Total Bills</h4>
          <p className="font-bold text-2xl md:text-3xl">
            {total.toLocaleString('en')}
          </p>
        </div>

        <div className="flex flex-col items-center w-full">
          <h4 className="text-secondary text-lg">Senate</h4>
          <p className="font-bold text-2xl md:text-3xl">
            {senate.toLocaleString('en')}
          </p>
        </div>

        <div className="flex flex-col items-center w-full">
          <h4 className="text-secondary text-lg">House</h4>
          <p className="font-bold text-2xl md:text-3xl">
            {house.toLocaleString('en')}
          </p>
        </div>
      </dl>
    </article>
  );
}

const CARDS: CardType[] = [
  {
    id: 1,
    Icon: FiTarget,
    title: 'The Mission: Expose',
    description: `Not a 'project'. Not a 'startup'. DOGEai is an autonomous AI weapon. Engineered with one mission: hunt down and expose the waste, the grift, the dysfunction. Forget summaries; think forensic analysis at machine speed.`,
  },
  {
    id: 2,
    Icon: FaDatabase,
    title: 'The Intel: Raw & Real',
    description: `Trained on the raw feed: 19,000+ bills, federal contracts, grant databases, FOIA trails, audits, real-time data. Every output? Sourced. Every breakdown? Precise. No escape.`,
  },
  {
    id: 3,
    Icon: FiZap,
    title: 'The Method: Surgical Strike',
    description: `It doesn’t summarize; it dissects. It doesn’t explain; it indicts. It tracks the money, the power, the consequences. And it names names. Direct. Unflinching. Allergic to PR speak. It delivers the facts you weren't meant to find.`,
  },
];

const TOKEN = '9UYAYvVS2cZ3BndbsoG1ScJbjfwyEPGxjE79hh5ipump';
const truncateToken = (token: string) => {
  return `${token.slice(0, 8)}...${token.slice(-8)}`;
};

const VelocityHero = () => {
  const targetRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end start'],
  });

  const scrollVelocity = useVelocity(scrollYProgress);

  const skewXRaw = useTransform(scrollVelocity, [-1, 1], ['45deg', '-45deg']);
  const skewX = useSpring(skewXRaw, { mass: 3, stiffness: 400, damping: 50 });

  const xRaw = useTransform(scrollYProgress, [0, 1], [0, -2000]);
  const x = useSpring(xRaw, { mass: 3, stiffness: 400, damping: 50 });

  return (
    <section ref={targetRef} className="h-[400vh]">
      <div className="sticky top-0 flex h-screen flex-col justify-between overflow-hidden">
        <div className="relative flex w-full justify-between p-6" />
        <div className="flex items-center justify-center pb-24 md:pb-0 px-4">
          <h1 className="font-bold text-neutral-400 text-5xl md:text-7xl">
            Forget Tools. <br />
            Forget Platforms.
            <br />
            <span className="inline-block -skew-x-[18deg] font-black text-neutral-950">
              Meet DOGEai: Your Weapon.
            </span>
          </h1>
        </div>
        <motion.p
          style={{ skewX, x }}
          className="origin-bottom-left whitespace-nowrap text-7xl font-black uppercase leading-[0.85] md:text-9xl md:leading-[0.85]"
        >
          Complexity: Their Shield. Your Blindfold.
        </motion.p>
        <ScrollArrow />
      </div>
    </section>
  );
};

const ScrollArrow = () => {
  return (
    <>
      <div className="absolute left-4 top-1/2 hidden -translate-y-1/2 text-xs lg:block">
        <span
          style={{
            writingMode: 'vertical-lr',
          }}
        >
          SCROLL
        </span>
        <FiArrowDown className="mx-auto" />
      </div>
      <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 text-xs lg:block">
        <span
          style={{
            writingMode: 'vertical-lr',
          }}
        >
          SCROLL
        </span>
        <FiArrowDown className="mx-auto" />
      </div>
    </>
  );
};

export default function Home() {
  const [, copyToClipboard] = useCopyToClipboard();
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  }, [hasCopied]);

  return (
    <main>
      <VelocityHero />

      <div className="my-20">
        <StickyCards cards={CARDS} />
      </div>

      <motion.section
        transition={{
          staggerChildren: 0.1,
        }}
        initial="initial"
        whileInView="whileInView"
        className="relative mx-auto grid max-w-6xl grid-cols-3 gap-4 px-2 md:px-4"
      >
        <div className="col-span-3">
          <SectionHeading>
            Why DOGEai Terrifies The Establishment?
          </SectionHeading>
          <SectionSubheading>
            Generic AI plays safe, dilutes truth, protects the status quo.{' '}
            <span className="font-bold">DOGEai draws blood.</span>
          </SectionSubheading>
        </div>
        <HighlightBlock
          Icon={TbFocus2}
          iconClassName="text-red-500"
          title="Laser Focus"
          subtitle="Other AIs try to be everything. DOGEai does ONE thing: expose government failure. Tuned for confrontation, not comfort."
        />
        <HighlightBlock
          Icon={FaShieldAlt}
          iconClassName="text-pink-500"
          title="Anti-Bias
          Warfare"
          subtitle={`This isn't passive neutrality. It's a deliberate
          WAR against baked-in bias. Relentless testing, prompt warfare, manual
          overrides. Objective: apolitical, actionable truth.`}
        />
        <HighlightBlock
          Icon={FaClock}
          iconClassName="text-blue-500"
          title="Real-Time Truth"
          subtitle={`While others digest old news, DOGEai analyzes legislation and spending AS IT HAPPENS. Catching lies before they spread.`}
        />
        <HighlightBlock
          Icon={FaTerminal}
          iconClassName="text-orange-500"
          title="Your Investigation Cockpit"
          subtitle={`The Terminal isn't a feed; it's an interrogation room YOU control. Hunt earmarks. Track contractors. Audit agencies. Stop reading summaries; start investigating.`}
        />
        <HighlightBlock
          Icon={FaAnchor}
          iconClassName="text-zinc-500"
          title="Radical Independence"
          subtitle={`Answers to NO ONE. Not DC, not parties, not donors, not censors. Cannot be bought, pressured, or canceled. Built to outlast the corruption it targets.`}
        />
        <HighlightBlock
          Icon={TbTrendingUp}
          iconClassName="text-green-500"
          title="Growing Influence Daily"
          subtitle={`This is the first AI built not for institutions, but for the American people footing the bill.`}
        />
      </motion.section>

      <section
        aria-labelledby="congress-stats-heading"
        className="mt-14 flex flex-col items-center py-7 gap-4 container mx-auto"
      >
        <h2 id="congress-stats-heading" className="sr-only">
          Congress Statistics
        </h2>
        <time
          className="py-2 px-3 md:text-lg select-none"
          style={{
            borderRadius: '210px',
            border: '1px solid #232A43',
          }}
          dateTime="2025-06-02"
        >
          <span className="text-secondary">Bill Cutoff Date: </span>
          <span className="font-semibold">June 02, 2025</span>
        </time>

        <div className="grid md:grid-cols-2 gap-4 w-full mb-10">
          <CongressCard
            number={118}
            total={15746}
            senate={5445}
            house={10301}
          />
          <CongressCard number={119} total={5329} senate={1808} house={3521} />
        </div>
      </section>

      <section id="subscribe" className="mx-auto">
        <iframe
          src="https://dogeai.substack.com/embed"
          width="100%"
          height="300px"
        ></iframe>
      </section>

      <section className="bg-white px-2 py-24 md:px-4">
        <div className="mx-auto flex max-w-5xl flex-col items-center">
          <SectionHeading>Support $DOGEai token</SectionHeading>
          <p className="mx-auto mb-4 text-center text-base leading-relaxed md:text-xl md:leading-relaxed">
            Enables us to fund the operations & reward contributors.
          </p>
          <div className="relative rounded-lg flex flex-col items-center">
            <div
              className="bg-primary rounded-[36px] py-2 px-4"
              role="region"
              aria-label="Token information"
            >
              <p className="text-sm flex flex-row items-center gap-1">
                <span className="select-none text-white">Token: </span>
                <span className="md:hidden block select-text text-white font-bold">
                  {truncateToken(TOKEN)}
                </span>
                <span className="hidden md:block select-text text-white font-bold">
                  {TOKEN}
                </span>
                <Button
                  variant="ghost"
                  className="h-6 w-2 text-white"
                  onClick={() => {
                    copyToClipboard(TOKEN);
                    setHasCopied(true);
                  }}
                  aria-label={hasCopied ? 'Token copied' : 'Copy token'}
                >
                  {hasCopied ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg
                      className="h-3 w-3"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  )}
                </Button>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
