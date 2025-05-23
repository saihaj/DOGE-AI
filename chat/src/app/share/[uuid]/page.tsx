import { ChatWithCustomScroll } from '@/components/chat-scroll';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { trpcServerClient } from '@/lib/trpc/server';
import { UIMessage } from 'ai';
import { Metadata, ResolvingMetadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NextResponse } from 'next/server';
import React from 'react';
import removeMarkdown from 'markdown-to-text';

// Generate metadata for SEO
export async function generateMetadata(
  { params }: { params: Promise<{ uuid: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { uuid } = await params;

  const { chat, messages } = await trpcServerClient.getPublicChatMessages.query(
    {
      id: uuid,
    },
  );

  // If no conversation found, use default metadata
  if (!chat) {
    return {
      title: 'Shared Conversation - DOGEai Chat',
      description: 'View a shared conversation from DOGEai Chat.',
    };
  }

  // Get the first few messages to create a description
  const firstFewMessages = removeMarkdown(
    messages
      .filter(m => m.role === 'assistant')
      .flatMap(m => m.parts)
      .filter(m => m.type === 'text')
      .map(m => m.text)
      .slice(0, 3)
      .join('\n\n'),
  )
    .replace(/\n/g, ' ')
    .trim();

  const description =
    firstFewMessages.length > 160
      ? `${firstFewMessages.substring(0, 157)}...`
      : firstFewMessages;

  const title = `${chat.title} - DOGEai Chat`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: 'https://dogeai.info/images/hero.png',
          alt: 'DOGEai Chat',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        {
          url: 'https://dogeai.info/images/hero.png',
          alt: 'DOGEai Chat',
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
  const { messages } = await trpcServerClient.getPublicChatMessages.query({
    id: uuid,
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
                    <Button variant="outline" asChild>
                      <Link href="/">Start a new chat</Link>
                    </Button>
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
                      <p className="text-sm text-muted-foreground">
                        This conversation is shared publicly.{' '}
                        <Link
                          href="/"
                          className="text-primary underline underline-offset-4"
                        >
                          Start your own conversation
                        </Link>
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

export const runtime = 'edge';
