import { notFound } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Message, MessageContent } from '@/components/ui/message';
import { ChatContainer } from '@/components/ui/chat-container';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Metadata, ResolvingMetadata } from 'next';

// This would connect to your API/database to fetch the shared conversation
async function getSharedConversation(uuid: string) {
  // Replace with your actual data fetching logic
  // Example: return await db.conversation.findUnique({ where: { uuid } });
  try {
    // In a production environment, you would likely query your database directly here
    // rather than making an API call from a server component
    const response = await fetch(`http://localhost:4322/api/share/${uuid}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add next.js specific config to ensure proper server-side fetch
      next: {
        revalidate: 0, // Ensure fresh data on each request
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching shared conversation:', error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata(
  { params }: { params: { uuid: string } },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const uuid = params.uuid;

  // Fetch the conversation data
  const conversation = await getSharedConversation(uuid);

  // If no conversation found, use default metadata
  if (!conversation) {
    return {
      title: 'Shared Conversation - DOGEai Chat',
      description: 'View a shared conversation from DOGEai Chat.',
    };
  }

  // Get the first few messages to create a description
  const firstFewMessages = conversation.messages
    .slice(0, 2)
    .map(msg => msg.content)
    .join(' - ');

  const description =
    firstFewMessages.length > 160
      ? `${firstFewMessages.substring(0, 157)}...`
      : firstFewMessages;

  return {
    title: `Shared Conversation - DOGEai Chat`,
    description,
    openGraph: {
      title: `DOGEai Chat - Shared Conversation`,
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
      title: `DOGEai Chat - Shared Conversation`,
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
  params: { uuid: string };
}) {
  // Destructure uuid from params
  const uuid = params.uuid;
  const conversation = await getSharedConversation(uuid);

  // If conversation not found, show 404 page
  if (!conversation) {
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
                <div className="w-full text-center mt-4">
                  <div className="inline-block px-4 py-1 bg-muted rounded-full text-sm">
                    Shared Conversation
                  </div>
                </div>
              </header>

              <div className="relative w-full flex flex-col items-center pt-4 pb-4">
                <div className="w-full max-w-3xl flex flex-col">
                  <ChatContainer
                    autoScroll={false}
                    className="relative group flex flex-col justify-center w-full max-w-3xl md:px-4 pb-2 gap-2 items-end"
                  >
                    {conversation.messages.map((message, index) => {
                      const isAssistant = message.role === 'assistant';

                      return (
                        <Message
                          key={index}
                          className={cn(
                            message.role === 'user'
                              ? 'justify-end'
                              : 'justify-start max-w-none w-full',
                            'py-2',
                          )}
                        >
                          {isAssistant ? (
                            <MessageContent className="px-0 md:px-2" markdown>
                              {message.content}
                            </MessageContent>
                          ) : (
                            <MessageContent className="bg-primary w-full text-primary-foreground whitespace-normal">
                              {message.content}
                            </MessageContent>
                          )}
                        </Message>
                      );
                    })}
                  </ChatContainer>
                </div>
              </div>

              <footer className="w-full max-w-3xl mt-auto py-4 text-center border-t">
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
