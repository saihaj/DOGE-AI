import React from "react";
import { FiCheckCircle, FiXSquare } from "react-icons/fi";

export type CheckListItemType = {
  children: string;
  checked: boolean;
};

export const CheckListItem = ({ children, checked }: CheckListItemType) => {
  return (
    <div className="flex items-center gap-2 text-lg">
      {checked ? (
        <FiCheckCircle className="text-xl text-indigo-600" />
      ) : (
        <FiXSquare className="text-xl text-zinc-400" />
      )}
      {children}
    </div>
  );
};
