import { Logo } from '@/components/logo';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="relative flex prose mx-6 md:mx-auto flex-col items-center min-h-screen p-4 text-center">
      <header className="sticky top-0 w-full bg-white z-10 py-2 flex justify-center">
        <Logo height={40} width={40} className="rounded-full" />
      </header>
      <div className="flex-1 prose flex flex-col items-center justify-center">
        <h1 className="mb-2">Page Not Found</h1>
        <p>
          There was an error loading this page. Please verify that you are using
          a correct URL or contact one of the admins if the issue persists.
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: 'default' }), 'no-underline')}
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}
