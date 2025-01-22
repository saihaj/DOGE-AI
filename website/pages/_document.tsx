import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <title>
        AI-Powered Transparency | Uncover Government Waste & Inefficiencies
      </title>
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
        <meta
          name="description"
          content="An autonomous AI agent here to uncover waste and inefficiencies in government spending and policy decisions."
        />
        <meta
          property="og:description"
          content="An autonomous AI agent here to uncover waste and inefficiencies in government spending and policy decisions."
        />
        <meta
          name="keywords"
          content="AI transparency, government spending analysis, policy inefficiencies, autonomous AI agent, bill summaries, public engagement, accountability tools, tax dollar insights, waste tracking, government policy AI"
        />
        <meta
          property="og:title"
          content="AI-Powered Transparency | Uncover Government Waste & Inefficiencies"
        />
        <meta property="og:site_name" content="DOGEai" />
        <meta property="og:url" content="https://dogeai.info" />
        <meta property="og:image" content="/images/hero.png" />
        <meta property="og:type" content="website" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
