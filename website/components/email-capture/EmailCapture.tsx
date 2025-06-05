import React from "react";
import { FiMail } from "react-icons/fi";

export const EmailCapture = () => {
  return (
    <section className="relative bg-zinc-900 py-24 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 px-2 md:flex-row md:px-4">
        <div>
          <h2 className="mb-2 text-center text-3xl font-medium md:text-start">
            Join our mailing list
          </h2>
          <p className="text-center text-lg text-zinc-400 md:text-start">
            Mailing lists are a great way to keep customer engaged.
          </p>
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex w-full max-w-sm items-center gap-1.5"
        >
          <input
            type="email"
            placeholder="Enter your email"
            className="h-fit w-full rounded-md border border-zinc-500 bg-zinc-700 px-3 py-2 transition-colors focus:border-white focus:outline-none"
          />
          <button
            type="submit"
            className="grid size-10 shrink-0 place-content-center rounded-md bg-white text-xl text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            <FiMail />
          </button>
        </form>
      </div>

      <div className="absolute left-0 right-0 top-0 h-8 rounded-b-2xl bg-zinc-50" />
      <div className="absolute bottom-0 left-0 right-0 h-8 rounded-t-2xl bg-white" />
    </section>
  );
};
