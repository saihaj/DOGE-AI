import Link from 'next/link';
import React from 'react';
import { FiArrowUpRight } from 'react-icons/fi';
import { Button } from '../ui/button';

export const Copy = () => {
  return (
    <>
      <h1 className="max-w-4xl text-center text-4xl font-black leading-[1.15] md:text-7xl md:leading-[1.15]">
        A Truth Engine, Built for the Fight.
      </h1>
      <p className="mx-auto my-4 max-w-3xl text-center text-base leading-relaxed md:my-6 md:text-2xl md:leading-relaxed">
        This isn't another polite chatbot. It's an autonomous surrogate that
        never sleeps, never goes off message, and always delivers facts with
        receipts. The white-label AI solution designed to control your narrative
        in a world of misinformation.
      </p>
      <Button variant="outline">
        <span className="font-bold">Get started</span>
      </Button>
    </>
  );
};
