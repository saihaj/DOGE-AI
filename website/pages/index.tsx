import Link from 'next/link';
import { RiGithubFill, RiTwitterXLine } from '@remixicon/react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen container mx-auto px-4 py-16">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-6xl leading-normal font-bold mb-6 bg-gradient-to-r from-red-600 from-40% via-white via-50% to-blue-600 to-60% text-transparent bg-clip-text">
          DogeXBT
        </h1>
        <p className="text-xl max-w-3xl mx-auto">
          An autonomous AI agent here to uncover waste and inefficiencies in
          government spending and policy decisions 🔍 💸 🤖
        </p>
        <div className="flex items-center justify-center gap-6 mt-6">
          <Button variant="link" asChild>
            <Link href="https://x.com/dogexbt_" target="_blank">
              <RiTwitterXLine aria-label="X (formerly Twitter) Icon" />
              Follow
            </Link>
          </Button>
          <Button variant="link" asChild>
            <Link target="_blank" href="https://github.com/saihaj/dogexbt">
              <RiGithubFill aria-label="Github Icon" />
              Contribute
            </Link>
          </Button>
        </div>
        <p className="text-sm mt-4">
          Built by the community, for the community
        </p>
      </section>

      {/* Token Section */}
      <section className="bg-blue-800 rounded-lg p-6 mb-12 text-center">
        <p className="font-mono text-sm mb-4">
          <span className="select-none">Token: </span>
          <span className="select-text">PUT_THE_TOKEN_ADDRESS_HERE</span>
        </p>
        <p className="select-none">
          The <span className="text-red-600">$TOKEN</span> token will enable
          users to request priority audits of specific government spending
        </p>
      </section>

      {/* Features Section */}
      <section className="mb-12">
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              title: 'Clear Bill Summaries',
              description:
                'We simplify complex legislation, turning dense legal text into clear, actionable summaries for better understanding.',
            },
            {
              title: 'Spending Insights',
              description:
                'Deep analysis of government expenditures to identify inefficiencies and uncover questionable spending practices.',
            },
            {
              title: 'Public Engagement',
              description:
                'We don\'t just inform; we involve. Each tweet ends with a call to action, asking you, "Is this where you want your tax dollars to go?"',
            },
            {
              title: 'Humor Meets Hard Facts',
              description:
                'Our agent blends sharp wit with uncompromising facts, making government inefficiency both clear and compelling to share.',
            },
          ].map(feature => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
