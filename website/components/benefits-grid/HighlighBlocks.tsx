import React from "react";
import { Block } from "./Block";
import {
  FiArrowUpRight,
  FiClipboard,
  FiCoffee,
  FiDollarSign,
  FiFeather,
  FiInbox,
  FiMove,
  FiRepeat,
  FiSmile,
} from "react-icons/fi";
import { IconType } from "react-icons";
import { twMerge } from "tailwind-merge";
import { CardTitle } from "./CardTitle";
import { CardSubtitle } from "./CardSubtitle";

export const HighlighBlocks = () => {
  return (
    <>
      <HighlightBlock
        Icon={FiDollarSign}
        iconClassName="text-green-500"
        title="Save on planning"
        subtitle="Lorem ipsum dolor sit amet consectetur adipisicing elit."
      />
      <HighlightBlock
        Icon={FiArrowUpRight}
        iconClassName="text-pink-500"
        title="Grow your margins"
        subtitle="Lorem ipsum dolor sit amet consectetur adipisicing elit."
      />
      <HighlightBlock
        Icon={FiSmile}
        iconClassName="text-blue-500"
        title="Increase productivity"
        subtitle="Lorem ipsum dolor sit amet consectetur adipisicing elit."
      />
      <HighlightBlock
        Icon={FiCoffee}
        iconClassName="text-orange-500"
        title="No more late nights"
        subtitle="Lorem ipsum dolor sit amet consectetur adipisicing elit."
      />
      <HighlightBlock
        Icon={FiFeather}
        iconClassName="text-zinc-500"
        title="Take better notes"
        subtitle="Lorem ipsum dolor sit amet consectetur adipisicing elit."
      />
      <HighlightBlock
        Icon={FiInbox}
        iconClassName="text-purple-500"
        title="Reach inbox zero"
        subtitle="Lorem ipsum dolor sit amet consectetur adipisicing elit."
      />
      <HighlightBlock
        Icon={FiMove}
        iconClassName="text-fuchsia-500"
        title="Remain flexible"
        subtitle="Lorem ipsum dolor sit amet consectetur adipisicing elit."
      />
      <HighlightBlock
        Icon={FiClipboard}
        iconClassName="text-red-500"
        title="Stay on track"
        subtitle="Lorem ipsum dolor sit amet consectetur adipisicing elit."
      />
      <HighlightBlock
        Icon={FiRepeat}
        iconClassName="text-yellow-500"
        title="Repeat what works"
        subtitle="Lorem ipsum dolor sit amet consectetur adipisicing elit."
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
    <Icon className={twMerge("text-3xl text-indigo-600", iconClassName)} />
    <CardTitle>{title}</CardTitle>
    <CardSubtitle>{subtitle}</CardSubtitle>
  </Block>
);
