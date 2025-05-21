import { ChatWithCustomScroll } from '@/components/chat-scroll';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { trpcServerClient } from '@/lib/trpc/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import React from 'react';

// Generate metadata for SEO
// export async function generateMetadata(
//   { params }: { params: { uuid: string } },
//   parent: ResolvingMetadata,
// ): Promise<Metadata> {
//   const uuid = params.uuid;

//   // Fetch the conversation data
//   const conversation = await getSharedConversation(uuid);

//   // If no conversation found, use default metadata
//   if (!conversation) {
//     return {
//       title: 'Shared Conversation - DOGEai Chat',
//       description: 'View a shared conversation from DOGEai Chat.',
//     };
//   }

//   // Get the first few messages to create a description
//   const firstFewMessages = conversation.messages
//     .slice(0, 2)
//     .map(msg => msg.content)
//     .join(' - ');

//   const description =
//     firstFewMessages.length > 160
//       ? `${firstFewMessages.substring(0, 157)}...`
//       : firstFewMessages;

//   return {
//     title: `Shared Conversation - DOGEai Chat`,
//     description,
//     openGraph: {
//       title: `DOGEai Chat - Shared Conversation`,
//       description,
//       images: [
//         {
//           url: 'https://dogeai.info/images/hero.png',
//           alt: 'DOGEai Chat',
//         },
//       ],
//     },
//     twitter: {
//       card: 'summary_large_image',
//       title: `DOGEai Chat - Shared Conversation`,
//       description,
//       images: [
//         {
//           url: 'https://dogeai.info/images/hero.png',
//           alt: 'DOGEai Chat',
//         },
//       ],
//     },
//   };
// }

export default async function SharedConversationPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  const messages = await trpcServerClient.getPublicChatMessages.query({
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
                <ChatWithCustomScroll status="ready" messages={messages} />
              </div>

              <footer className="sticky bottom-0 w-full max-w-3xl mt-auto py-4 text-center border-t">
                <p className="text-sm text-muted-foreground">
                  This is a read-only view of a shared DOGEai conversation.{' '}
                  <Link
                    href="/"
                    className="text-primary underline underline-offset-4"
                  >
                    Start your own conversation
                  </Link>
                </p>
              </footer>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export const runtime = 'edge';
