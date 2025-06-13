import { ChatWithCustomScroll } from '@/components/chat-scroll';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { createTrpcServerClient } from '@/lib/trpc/server';
import { generateId, UIMessage } from 'ai';
import { notFound } from 'next/navigation';
import React from 'react';
import { ForkConversation } from './fork-convo';
import removeMarkdown from 'markdown-to-text';
import { Metadata, ResolvingMetadata } from 'next';

// Generate metadata for SEO
export async function generateMetadata(
  { params }: { params: Promise<{ uuid: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { uuid } = await params;
  const trpc = createTrpcServerClient();
  const { chat, messages } = await trpc.getTweetMessages.query({
    tweetId: uuid,
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4322';
  const ogImageUrl = `${baseUrl}/t/${uuid}/opengraph-image`;

  // If no conversation found, use default metadata
  if (!chat) {
    return {
      title: 'Shared Conversation - DOGEai Chat',
      description: 'View a shared conversation from DOGEai Chat.',
    };
  }

  const userMesage = messages.find(m => m.role === 'user');
  const substringTitle = `${userMesage?.content.substring(0, 40)}...`;
  const title = `${substringTitle || 'Continue Twitter Conversation'} - DOGEai Chat`;

  // Get the first few messages to create a description
  const firstFewMessages = removeMarkdown(
    messages
      .filter(m => m.role === 'assistant')
      .map(m => m.content)
      .slice(0, 3)
      .join('\n\n'),
  )
    .replace(/\n/g, ' ')
    .trim();

  const description =
    firstFewMessages.length > 160
      ? `${firstFewMessages.substring(0, 157)}...`
      : firstFewMessages;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'DOGEai Chat Open Graph Image',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'DOGEai Chat Open Graph Image',
        },
      ],
    },
  };
}

export default async function SharedConversationPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  const trpc = createTrpcServerClient();
  const { messages } = await trpc.getTweetMessages.query({
    tweetId: uuid,
  });

  // If conversation not found, show 404 page
  if (!messages || messages.length === 0) {
    notFound();
  }

  return (
    <div className="flex w-full h-full">
      <div className="flex w-full h-full overflow-hidden @container/mainview">
        <main className="h-dvh flex-grow flex-shrink relative selection:bg-highlight w-0 @container isolate">
          <div className="relative flex flex-col items-center h-full @container/main">
            <div className="w-full overflow-y-auto overflow-x-hidden scrollbar-gutter-stable flex flex-col items-center px-5">
              <header className="w-full sticky top-0 z-50 bg-background mask-b-from-90% backdrop-blur-md pb-2">
                <div className="flex items-center justify-between w-full mt-2">
                  <div className="flex items-center">
                    <Logo height={40} width={40} className="rounded-full" />
                    <span className="text-2xl ml-2 font-bold gradient-america text-transparent bg-clip-text">
                      DOGEai
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <ForkConversation messages={JSON.stringify(messages)} />
                  </div>
                </div>
              </header>

              <div className="w-full max-w-3xl flex flex-col">
                <ChatWithCustomScroll
                  status="ready"
                  // TODO: improve this
                  messages={messages as unknown as UIMessage[]}
                />
              </div>

              <footer className="absolute bottom-0 mx-auto inset-x-0 max-w-(--breakpoint-md) z-40">
                <div className="relative z-40 flex flex-col items-center w-full">
                  <div style={{ opacity: 1, transform: 'none' }} />
                  <div className="relative w-full sm:px-5 px-2 py-2 bg-white">
                    <div className="bottom-0 mb-[env(safe-area-inset-bottom)] w-full text-base flex flex-col gap-2 items-center justify-center relative z-10">
                      <p className="text-xs md:text-sm">
                        <ForkConversation messages={JSON.stringify(messages)} />
                      </p>
                    </div>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
