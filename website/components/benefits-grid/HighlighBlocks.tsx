import React from 'react';
import { Block } from './Block';
import { IconType } from 'react-icons';
import { twMerge } from 'tailwind-merge';
import { CardTitle } from './CardTitle';
import { CardSubtitle } from './CardSubtitle';
import { GiPlatform } from 'react-icons/gi';
import { FaClock, FaShieldAlt } from 'react-icons/fa';
import { IoIosPeople, IoIosRadio } from 'react-icons/io';
import { GrIntegration } from 'react-icons/gr';

export const HighlighBlocks = () => {
  return (
    <>
      <HighlightBlock
        Icon={GiPlatform}
        iconClassName="text-green-500"
        title="Your Policy Platform"
        subtitle="Your version of DOGEai speaks directly to your policy platform, defending your record and legislation with sourced facts that voters can trust."
      />
      <HighlightBlock
        Icon={FaShieldAlt}
        iconClassName="text-pink-500"
        title="Misinformation Defense"
        subtitle={`Refute misinformation before it spreads. Counterattack opponents' claims with hard data and timestamps. Package every response in high-engagement, social-friendly language.`}
      />
      <HighlightBlock
        Icon={FaClock}
        iconClassName="text-blue-500"
        title="24/7 Engagement"
        subtitle={`An autonomous surrogate that never sleeps, never goes off message, and answers instantly, factually, and with receipts. Always on duty while your team rests.`}
      />
      <HighlightBlock
        Icon={IoIosPeople}
        iconClassName="text-orange-500"
        title="Voter Interaction Hub"
        subtitle={`Voters can ask where you stand on issues, learn what's in bills you sponsored, see facts behind controversies, and get instant comparisons between you and opponents.`}
      />
      <HighlightBlock
        Icon={GrIntegration}
        iconClassName="text-zinc-500"
        title="Seamless Integration"
        subtitle={`Embeds into your campaign website with your branding, voice, and tone. Trained on your interviews, speeches, and platform docs. No technical expertise needed—our team handles everything.`}
      />
      <HighlightBlock
        Icon={IoIosRadio}
        iconClassName="text-purple-500"
        title="The Strategic Advantage"
        subtitle="DOGEai doesn't behave like typical campaign tools. It's a press secretary, policy explainer, and opposition research bot all in one."
      />
    </>
  );
};

type Props = {
  Icon: IconType;
  iconClassName: string;
  title: string;
  subtitle: string;
};

const HighlightBlock = ({ iconClassName, Icon, title, subtitle }: Props) => (
  <Block className="col-span-3 space-y-1.5 md:col-span-1">
    <Icon className={twMerge('text-3xl text-indigo-600', iconClassName)} />
    <CardTitle>{title}</CardTitle>
    <CardSubtitle>{subtitle}</CardSubtitle>
  </Block>
);
