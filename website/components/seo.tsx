import Head from 'next/head';

const DESCRIPTION =
  'Track wasteful government spending and ensure transparency with DOGEai. Simplifying complex bills into clear insights to empower informed public decisions.';
const KEYWORDS =
  ' ai government spending analysis, uncover government waste, policy inefficiencies, dogeai insights, legislative analysis, government waste';
const TITLE = 'AI-Powered Transparency | Uncover Government Waste | DOGEai';

export function Seo({
  title = TITLE,
  description = DESCRIPTION,
  keywords = KEYWORDS,
  image = 'https://dogeai.info/images/hero.png',
}: {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
}) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* opengraph */}
      <meta property="og:description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:site_name" content="DOGEai" />
      <meta property="og:url" content="https://dogeai.info" />
      <meta property="og:image" content={image} />
      <meta property="og:type" content="website" />

      {/* twitter */}
      <meta property="twitter:image" content={image} />
      <meta property="twitter:card" content="summary_large_image" />
    </Head>
  );
}
