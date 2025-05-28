'use client';
import 'ios-vibrator-pro-max';
import { LoginButton } from '@/app/login';
import { ChatInput } from '@/components/chat-input';
import { ChatWithCustomScroll } from '@/components/chat-scroll';
import { ClientOnly } from '@/components/client-only';
import { Logo } from '@/components/logo';
import { useRateLimit } from '@/components/providers';
import { Button, buttonVariants } from '@/components/ui/button';
import { API_URL, PRIVY_COOKIE_NAME } from '@/lib/const';
import { useTRPC } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import { usePrivy } from '@privy-io/react-auth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCopyToClipboard, useLocalStorage } from '@uidotdev/usehooks';
import { UIMessage } from 'ai';
import 'ios-vibrator-pro-max';
import { Share, SquarePen } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import posthog from 'posthog-js';

function ChatPage() {
  const [privyToken] = useLocalStorage('privy:token', '');
  const containerRef = useRef(null);
  const { login, authenticated } = usePrivy();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const chatId = params.id as string;
  const initialMessage = searchParams.get('message');
  const { reachedLimitForTheDay, setReachedLimitForTheDay } = useRateLimit();
  const [, copyToClipboard] = useCopyToClipboard();

  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] =
    useState(false);
  const [isNewChat] = useState(searchParams.get('newChat'));

  const trpc = useTRPC();
  const { data, error } = useQuery(
    trpc.getUserChatMessages.queryOptions(
      { id: chatId },
      {
        enabled: !!chatId && authenticated && !isNewChat,
        refetchOnWindowFocus: false,
        retry: (count, error) => {
          // Chat not found
          if (error.data?.code === 'NOT_FOUND') {
            return false;
          }

          // at most 3 retries
          if (count > 3) {
            posthog.captureException(error);
            return false;
          }

          return true;
        },
      },
    ),
  );

  const { mutateAsync: makeChatPublic } = useMutation(
    trpc.makeChatPublic.mutationOptions({
      retry: 3,
      onError: error => {
        posthog.captureException(error);
      },
    }),
  );

  const {
    messages,
    input,
    setInput,
    stop,
    handleSubmit,
    reload,
    status,
    append,
  } = useChat({
    initialMessages:
      data?.map(message => ({
        id: message.id,
        content: '',
        createdAt: new Date(message.createdAt),
        parts: message.parts as UIMessage['parts'],
        role: message.role as UIMessage['role'],
      })) || undefined,
    id: chatId,
    api: `${API_URL}/api/userchat`,
    headers: {
      [PRIVY_COOKIE_NAME]: privyToken,
    },
    experimental_prepareRequestBody: body => ({
      id: body.id,
      message: body.messages.at(-1),
    }),
    onResponse: async response => {
      if (response.status === 429) {
        setReachedLimitForTheDay(true);
      }
    },
    onError: error => {
      posthog.captureException(error, {
        chatId,
        messageCount: messages.length,
        lastMessageId: messages.at(-1)?.id,
      });

      const safeParsedError = (() => {
        try {
          return JSON.parse(error.message);
        } catch (e) {
          return null;
        }
      })();

      if (safeParsedError) {
        return toast.error(safeParsedError.error, {
          description: safeParsedError.message,
        });
      }

      toast.error(error.message, {
        dismissible: false,
        action: {
          label: 'Retry',
          onClick: () => reload(),
        },
      });
    },
  });

  // Handle initial message using state
  if (initialMessage && !hasProcessedInitialMessage && messages.length === 0) {
    append({
      content: initialMessage,
      role: 'user',
    });
    setHasProcessedInitialMessage(true);
    // Clean up the URL by removing the message parameter
    const url = `/chat/${chatId}`;
    window.history.replaceState({}, '', url);
  }

  const shareChat = async () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    copyToClipboard(`${window.location.origin}/share/${chatId}`);

    toast.promise(makeChatPublic({ id: chatId }), {
      loading: `Creating public link...`,
      success: () => `Chat link copied to clipboard!`,
      error: () => 'Failed to share chat',
    });
  };

  const startNewChat = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    stop();
    router.push('/');
  };

  return (
    <div className="flex w-full h-full" data-testid="global-drop">
      <div className="flex w-full h-full overflow-hidden @container/mainview">
        <main className="h-dvh flex-grow flex-shrink relative selection:bg-highlight w-0 @container isolate">
          <div className="relative flex flex-col items-center h-full @container/main">
            <div
              ref={containerRef}
              className="w-full overflow-y-auto overflow-x-hidden scrollbar-gutter-stable flex flex-col items-center px-5"
            >
              <header className="w-full sticky top-0 z-50 bg-background mask-b-from-90% backdrop-blur-md pb-2">
                <div className="flex items-center justify-between w-full mt-2">
                  <div className="flex items-center">
                    <Logo height={40} width={40} className="rounded-full" />
                    <span className="text-2xl ml-2 font-bold gradient-america text-transparent bg-clip-text">
                      DOGEai
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    {messages.length > 0 && (
                      <>
                        <Button onClick={shareChat} variant="outline">
                          <Share />
                        </Button>
                        <Button onClick={startNewChat} variant="outline">
                          <SquarePen />
                        </Button>
                      </>
                    )}
                    <LoginButton />
                  </div>
                </div>
              </header>
              <div className="relative w-full flex flex-col items-center pt-4 pb-4">
                {privyToken ? (
                  <>
                    {error ? (
                      <div className="relative w-full flex flex-col items-center pt-4 pb-4 mt-40">
                        <div className="flex-1 prose flex flex-col items-center justify-center">
                          <h1 className="mb-2 text-center">{error.message}</h1>
                          <p className="text-center">
                            There was an error loading this page. Please verify
                            that you are using a correct URL or contact one of
                            the admins if the issue persists.
                          </p>
                          <Link
                            prefetch
                            href="/"
                            className={cn(
                              buttonVariants({ variant: 'default' }),
                              'no-underline',
                            )}
                          >
                            Return Home
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full max-w-3xl flex flex-col">
                        <ChatWithCustomScroll
                          ref={containerRef}
                          status={status}
                          messages={messages}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="relative w-full flex flex-col items-center pt-4 pb-4 mt-40">
                    <div className="flex-1 prose flex flex-col items-center justify-center">
                      <h1 className="mb-2">Login to continue</h1>
                      <p>
                        This is a private chat. Please login to access your
                        messages.
                      </p>
                      <LoginButton />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {privyToken && !error && (
              <div className="absolute bottom-0 mx-auto inset-x-0 max-w-(--breakpoint-md) z-40">
                <div className="relative z-40 flex flex-col items-center w-full">
                  <div style={{ opacity: 1, transform: 'none' }} />
                  <div className="relative w-full px-5 md:px-4 pb-2 sm:pb-4">
                    <div className="bottom-0 mb-[env(safe-area-inset-bottom)] w-full text-base flex flex-col gap-2 items-center justify-center relative z-10">
                      <ChatInput
                        input={input}
                        rateLimited={reachedLimitForTheDay}
                        isLoading={
                          status === 'streaming' || status === 'submitted'
                        }
                        handleSubmit={e => {
                          if (reachedLimitForTheDay) {
                            return;
                          }

                          if (!authenticated) {
                            toast.error('Please login to continue', {
                              action: {
                                label: 'Login',
                                onClick: login,
                              },
                            });
                            return;
                          }
                          handleSubmit(e);
                        }}
                        setInput={setInput}
                        stop={stop}
                      />
                    </div>
                    <div className="absolute bottom-0 w-[calc(100%-2rem)] h-full bg-background" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <ChatPage />
    </ClientOnly>
  );
}
