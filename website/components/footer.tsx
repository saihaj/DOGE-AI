import Link from 'next/link';
import { Button } from './ui/button';
import { RiGithubFill, RiTwitterXLine } from '@remixicon/react';

export function Footer() {
  return (
    <footer className="border-t py-4" role="contentinfo">
      <div className="flex justify-between items-center container mx-auto px-4">
        <p className="text-sm">
          © {new Date().getFullYear()} To The Moon Labs Inc. All rights
          reserved.
        </p>

        <div className="flex items-center gap-3">
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
          <Button variant="outline" asChild size="sm">
            <Link
              target="_blank"
              href="https://github.com/saihaj/doge-ai"
              rel="noopener noreferrer"
              aria-label="Contribute on GitHub"
            >
              <RiGithubFill aria-label="Github Icon" />
              <span className="md:block hidden">Contribute</span>
            </Link>
          </Button>
        </div>
      </div>
    </footer>
  );
}
