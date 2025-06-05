import React from "react";
import { FiEdit } from "react-icons/fi";
import { BsFillCursorFill } from "react-icons/bs";
import { Block } from "./Block";
import { twMerge } from "tailwind-merge";
import { CardTitle } from "./CardTitle";
import { CardSubtitle } from "./CardSubtitle";

export const CollaborateBlock = () => (
  <Block className="col-span-3 overflow-hidden md:col-span-1">
    <div className="flex h-full flex-col justify-between gap-6">
      <div className="relative -mx-6 -mt-6 grid h-full place-content-center overflow-hidden border-b-2 border-zinc-900 bg-zinc-100 shadow-inner shadow-zinc-500">
        <div className="my-6 rounded-lg border-2 border-zinc-900 bg-white p-4 shadow shadow-zinc-500">
          <FiEdit className="text-4xl" />
        </div>

        <Cursor nameText="John Smith" />
        <Cursor
          nameText="Erin Brown"
          wrapperClassName="top-[10%] left-[10%]"
          cursorClassName="text-blue-500"
          nameClassName="border-blue-900 bg-blue-200 text-blue-900"
        />
        <Cursor
          nameText="Frank Daniels"
          wrapperClassName="top-[20%] left-[75%]"
          cursorClassName="text-green-500"
          nameClassName="border-green-900 bg-green-200 text-green-900"
        />
        <Cursor
          nameText="Andrea Green"
          wrapperClassName="top-[70%] left-[5%]"
          cursorClassName="text-orange-500"
          nameClassName="border-orange-900 bg-orange-200 text-orange-900"
        />
      </div>
      <div>
        <CardTitle>Collaborate seamlessly</CardTitle>
        <CardSubtitle>
          Lorem ipsum dolor sit amet consectetur adipisicing elit.
        </CardSubtitle>
      </div>
    </div>
  </Block>
);

type CursorProps = {
  wrapperClassName?: string;
  cursorClassName?: string;
  nameClassName?: string;
  nameText: string;
};

const Cursor = ({
  wrapperClassName,
  cursorClassName,
  nameClassName,
  nameText,
}: CursorProps) => {
  return (
    <div className={twMerge("absolute left-[60%] top-[60%]", wrapperClassName)}>
      <BsFillCursorFill
        className={twMerge(
          "-rotate-90 text-4xl text-pink-500",
          cursorClassName
        )}
      />
      <span
        className={twMerge(
          "block translate-x-1/2 whitespace-nowrap rounded border border-pink-900 bg-pink-200 px-1.5 py-0.5 text-xs text-pink-900",
          nameClassName
        )}
      >
        {nameText}
      </span>
    </div>
  );
};
