import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import { Providers } from '@/components/providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const TITLE = 'DOGEai Chat';
const DESCRIPTION =
  'Track wasteful government spending and ensure transparency with DOGEai. Simplifying complex bills into clear insights to empower informed public decisions.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    'ai government spending analysis, uncover government waste, policy inefficiencies, dogeai insights, legislative analysis, government waste',
  icons: [
    {
      rel: 'apple-touch-icon',
      url: '/apple-touch-icon.png',
      sizes: '180x180',
    },
    { rel: 'icon', url: '/favicon.ico', sizes: '32x32' },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      url: '/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      url: '/favicon-16x16.png',
    },
    {
      rel: 'canonical',
      url: 'https://dogeai.chat',
    },
    {
      rel: 'manifest',
      url: '/site.webmanifest',
    },
  ],
  openGraph: {
    type: 'website',
    siteName: 'DOGEai Chat',
    locale: 'en_US',
    url: 'https://dogeai.chat',
    title: TITLE,
    images: [
      {
        alt: 'DOGEai Chat',
        url: 'https://dogeai.info/images/hero.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: 'https://dogeai.info/images/hero.png',
        alt: 'DOGEai Chat',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#09090B',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
