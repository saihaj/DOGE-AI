import { Footer } from '@/components/footer';
import { ExpandableNavBar } from '@/components/navigation/ExpandableNavBar';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Funnel_Display } from 'next/font/google';

const mainFont = Funnel_Display({
  variable: '--font-main',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${mainFont.variable} font-serif text-black`}>
      <main className="overflow-hidden">
        <ExpandableNavBar />
        <Component {...pageProps} />
        <Footer />
      </main>
    </div>
  );
}
