import React, { useState } from "react";
import { Users } from "./Users";
import { Copy } from "./Copy";

export const Supports = () => {
  const [selected, setSelected] = useState(1);

  return (
    <section className="relative mx-auto flex max-w-6xl flex-col items-center gap-4 px-2 md:flex-row md:gap-8 md:px-4">
      <Copy selected={selected} setSelected={setSelected} />
      <Users selected={selected} />
    </section>
  );
};
