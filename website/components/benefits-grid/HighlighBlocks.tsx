import React from 'react';
import { Block } from './Block';
import { IconType } from 'react-icons';
import { twMerge } from 'tailwind-merge';
import { CardTitle } from './CardTitle';
import { CardSubtitle } from './CardSubtitle';
import { FaClock, FaLock, FaShieldAlt } from 'react-icons/fa';
import { IoIosPeople, IoIosRadio } from 'react-icons/io';
import { GrIntegration } from 'react-icons/gr';

export const HighlighBlocks = () => {
  return (
    <>
      <HighlightBlock
        Icon={FaLock}
        iconClassName="text-green-500"
        title="Policy-Locked AI"
        subtitle="Speaks directly to your priorities. It defends your record, reinforces your message, and delivers sourced facts your supporters and stakeholders can trust."
      />
      <HighlightBlock
        Icon={FaShieldAlt}
        iconClassName="text-pink-500"
        title="Misinformation Countermeasures"
        subtitle="Get ahead of falsehoods before they spread. DOGEai responds instantly with data, timestamps, and source links. Every reply is formatted for engagement and built to spread."
      />
      <HighlightBlock
        Icon={FaClock}
        iconClassName="text-blue-500"
        title="24/7 Surrogate"
        subtitle="The platform never sleeps, never strays off message, and always responds with receipts. While your team rests, DOGEai stays active and aligned."
      />
      <HighlightBlock
        Icon={IoIosPeople}
        iconClassName="text-orange-500"
        title="Supporter Interaction Engine"
        subtitle="Let voters, donors, and advocates ask questions, explore your stance, understand your track record, and compare your position to others in real time."
      />
      <HighlightBlock
        Icon={GrIntegration}
        iconClassName="text-zinc-500"
        title="Seamless Deployment"
        subtitle="Integrates into your site with full control over branding, tone, and content. No technical lift required. Our team handles setup, training, and refinement."
      />
      <HighlightBlock
        Icon={IoIosRadio}
        iconClassName="text-purple-500"
        title="Your Strategic Edge"
        subtitle="It operates as your press secretary, policy explainer, and opposition response engine. Fully aligned. Always on. Built to win the narrative."
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

export const HighlightBlock = ({
  iconClassName,
  Icon,
  title,
  subtitle,
}: Props) => (
  <Block className="col-span-3 space-y-1.5 md:col-span-1">
    <Icon className={twMerge('text-3xl text-indigo-600', iconClassName)} />
    <CardTitle>{title}</CardTitle>
    <CardSubtitle>{subtitle}</CardSubtitle>
  </Block>
);
