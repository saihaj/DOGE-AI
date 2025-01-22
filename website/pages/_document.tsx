import { Html, Head, Main, NextScript } from 'next/document';

const DESCRIPTION =
  'Track wasteful government spending and ensure transparency with DOGEai. Simplifying complex bills into clear insights to empower informed public decisions.';
const KEYWORDS =
  ' ai government spending analysis, uncover government waste, policy inefficiencies, dogeai insights, legislative analysis, government waste';
const TITLE = 'AI-Powered Transparency | Uncover Government Waste | DOGEai';

export default function Document() {
  return (
    <Html lang="en">
      <title>{TITLE}</title>
      <Head>
        <meta name="theme-color" content="#09090B" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta name="keywords" content={KEYWORDS} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:site_name" content="DOGEai" />
        <meta property="og:url" content="https://dogeai.info" />
        <meta
          property="og:image"
          content="https://dogeai.info/images/hero.png"
        />
        <meta
          property="twitter:image"
          content="https://dogeai.info/images/hero.png"
        />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://dogeai.info" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
