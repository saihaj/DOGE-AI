import PayPalDonate from '@/components/donate';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { RiTwitterXLine } from '@remixicon/react';
import Link from 'next/link';

export function Navbar() {
  return (
    <header className="flex items-center justify-between" role="banner">
      <nav className="flex items-center gap-4" aria-label="Home Navigation">
        <Link href="/" className="flex items-center gap-4">
          <Logo className="h-[50px] w-[50px] rounded-full" />
          <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-america">
            DOGEai
          </span>
        </Link>
      </nav>

      <nav className="flex items-center gap-3" aria-label="Social Links">
        <p className="text-lg font-medium lg:block hidden">
          Built by the community, for the community
        </p>
        <Button variant="outline" asChild size="sm">
          <Link
            href="https://x.com/dogeai_gov"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on X"
          >
            <RiTwitterXLine aria-label="X (formerly Twitter) Icon" />
            <span className="md:block hidden">Follow</span>
          </Link>
        </Button>
        <PayPalDonate />
      </nav>
    </header>
  );
}
