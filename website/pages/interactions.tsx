import { Footer } from '@/components/footer';
import { Navbar } from '@/components/nav';
import Head from 'next/head';
import pMap from 'p-map';
import { EmbeddedTweet } from 'react-tweet';
import { getTweet, type Tweet } from 'react-tweet/api';

const TWEETS = [
  '1918588031587516895',
  '1889399538739302452',
  '1921973751383519676',
  '1918068004585197643',
  '1919966159656325197',
  '1909665814883844522',
  '1919951029459644824',
  '1908564960562520453',
  '1919557734564855815',
  '1892997409828933650',
  '1919541866606825816',
  '1892670508702773476',
  '1906758034048827427',
  '1920571416522391788',
  '1909281762724753558',
  '1920094460811046965',
  '1909236197546737695',
  '1920072492426690693',
  '1909624758884270515',
  '1920666792805998949',
  '1906382245188759870',
  '1920860523706437712',
  '1906383361855103473',
  '1922344610220654826',
  '1922266727531893046',
  '1917586690589282796',
  '1922034361878159754',
  '1916971329468747799',
  '1922091400205635877',
  '1916031455911940279',
  '1921896710168609240',
  '1921767702462443697',
  '1922353788473463285',
  '1915773793840091265',
  '1922044649935397050',
  '1920609965649150073',
  '1919583078810361979',
  '1911107233418743875',
  '1897816402242965683',
  '1915900260276228549',
  '1892376841354170654',
  '1915896208239034380',
  '1907491201697329486',
  '1919140525728301320',
  '1911186204965699672',
  '1911491746309316866',
  '1897300815817367981',
  '1914831524509241470',
  '1922027790255173760',
  '1922607848665567700',
  '1922603797257375756',
  '1924449263938941349',
  '1924634437695754751',
  '1924528077121462310',
  '1924482831314464969',
  '1886589756794089731',
  '1923443524374000098',
];

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: Array<T>) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function getStaticProps() {
  const tweets = await pMap(TWEETS, id => getTweet(id), {
    concurrency: 10,
  });

  const pop = tweets.reverse().pop();

  return {
    props: { tweets: [pop, ...shuffleArray(tweets)] },
    revalidate: 60 * 60, // 1 hour
  };
}

export default function Page({ tweets }: { tweets: Array<Tweet> }) {
  return (
    <div className="min-h-screen container mx-auto px-4 py-5" role="main">
      <Head>
        <title>Loud, Clear, and Unignorable | DOGEai</title>
      </Head>
      <Navbar />

      <main className="container mx-auto px-2 py-4">
        <h1 className="text-balance text-3xl md:text-5xl text-center font-semibold mb-2 md:mb-8">
          Not Just Noticed. Recognized.
        </h1>
        <div className="columns-1 sm:columns-2 md:columns-3 gap-4">
          {tweets.map((tweet, index) => (
            <div key={index} className="break-inside-avoid mb-2 [&>div]:!mt-0">
              <EmbeddedTweet tweet={tweet} />
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
