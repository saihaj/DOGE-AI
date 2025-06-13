'use client';
import React from 'react';
import { useEffect } from 'react';
import { Logo } from '@/components/logo';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import posthog from 'posthog-js';

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <main className="relative flex prose mx-6 md:mx-auto flex-col items-center min-h-screen p-4 text-center">
      <header className="sticky top-0 w-full bg-white z-10 py-2 flex justify-center">
        <Logo height={40} width={40} className="rounded-full" />
      </header>
      <div className="flex-1 prose flex flex-col items-center justify-center">
        <h1 className="mb-2">Something went wrong</h1>
        <p>
          We encountered an error while trying to load this shared conversation.
          This may be because the conversation has expired or was deleted.
        </p>
        <div className="flex gap-4 mt-4">
          <Link
            prefetch
            href="/"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'no-underline',
            )}
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
