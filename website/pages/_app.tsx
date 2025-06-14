import { Footer } from '@/components/footer';
import { ExpandableNavBar } from '@/components/navigation/ExpandableNavBar';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Funnel_Display } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';

const mainFont = Funnel_Display({
  variable: '--font-main',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${mainFont.variable} font-serif text-black`}>
      <main>
        <ExpandableNavBar />
        <Component {...pageProps} />
        <Footer />
        <GoogleAnalytics gaId="G-FZM2EERC5V" />
      </main>
    </div>
  );
}
