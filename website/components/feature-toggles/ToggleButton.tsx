import React, { Dispatch, SetStateAction } from "react";

export const ToggleButton = ({
  children,
  selected,
  setSelected,
  id,
}: {
  children: string;
  selected: number;
  setSelected: Dispatch<SetStateAction<number>>;
  id: number;
}) => {
  return (
    <div
      className={`rounded-lg transition-colors ${
        selected === id ? "bg-indigo-600" : "bg-zinc-900"
      }`}
    >
      <button
        onClick={() => setSelected(id)}
        className={`w-full origin-top-left rounded-lg border py-3 text-xs font-medium transition-all md:text-base ${
          selected === id
            ? "-translate-y-1 border-indigo-600 bg-white text-indigo-600"
            : "border-zinc-900 bg-white text-zinc-900 hover:-rotate-2"
        }`}
      >
        {children}
      </button>
    </div>
  );
};
