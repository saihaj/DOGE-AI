import React, { useState } from "react";
import { ToggleButton } from "./ToggleButton";
import { data } from "./data";
import { FeatureDisplay } from "./FeatureDisplay";
import { SectionHeading } from "../shared/SectionHeading";
import { SectionSubheading } from "../shared/SectionSubheading";

export const FeatureToggles = () => {
  const [selected, setSelected] = useState(1);

  const el = data.find((d) => d.id === selected);

  return (
    <section className="relative mx-auto max-w-6xl px-2 md:px-4">
      <SectionHeading>Show the people what your product does</SectionHeading>
      <SectionSubheading>
        It should be very clear who your product is for and what problem it
        solves for them.
      </SectionSubheading>
      <div className="w-full">
        <div className="mb-9 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {data.map((d) => (
            <ToggleButton
              key={d.id}
              id={d.id}
              selected={selected}
              setSelected={setSelected}
            >
              {d.title}
            </ToggleButton>
          ))}
        </div>
        <div className="w-full translate-y-2 rounded-xl bg-zinc-900">
          <div className="w-full -translate-y-2 rounded-lg shadow-lg">
            <FeatureDisplay
              selected={selected}
              cardTitle={el!.cardTitle}
              cardSubtitle={el!.cardSubtitle}
              Component={el!.Component}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
