import React from "react";
import {
  FiBell,
  FiCheck,
  FiChevronDown,
  FiList,
  FiMessageCircle,
  FiUser,
} from "react-icons/fi";
import { LogoSmall } from "../navigation/Logo";

export const MockupScreen = () => {
  return (
    <div className="absolute bottom-0 left-1/2 h-36 w-[calc(100vw_-_56px)] max-w-[1100px] -translate-x-1/2 overflow-hidden rounded-t-xl bg-zinc-900 p-0.5">
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-0.5">
          <span className="size-2 rounded-full bg-red-400" />
          <span className="size-2 rounded-full bg-yellow-400" />
          <span className="size-2 rounded-full bg-green-400" />
        </div>
        <span className="rounded bg-zinc-600 px-2 py-0.5 text-xs text-zinc-100">
          your-website.com
        </span>
        <FiChevronDown className="text-white" />
      </div>
      <div className="relative z-0 grid h-full w-full grid-cols-[100px,_1fr] overflow-hidden rounded-t-lg bg-white md:grid-cols-[150px,_1fr]">
        <div className="h-full border-r border-zinc-300 p-2">
          <LogoSmall />
          <div className="mt-3 space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs text-indigo-600">
              <FiMessageCircle />
              <span>Messages</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <FiCheck />
              <span>Tasks</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <FiList />
              <span>Board</span>
            </span>
          </div>
        </div>

        <div className="relative z-0 p-2">
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded bg-zinc-200 px-1.5 py-1 pr-8 text-xs text-zinc-600">
              Search...
            </span>
            <div className="flex items-center gap-1.5 text-xl">
              <FiBell className="text-indigo-600" />
              <FiUser />
            </div>
          </div>
          <div className="h-full rounded-xl border border-dashed border-zinc-500 bg-zinc-100" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 top-0 z-10 bg-gradient-to-b from-white/0 to-white" />
      </div>
    </div>
  );
};
