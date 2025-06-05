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
      <Component {...pageProps} />
    </div>
  );
}
