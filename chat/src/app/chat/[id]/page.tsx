'use client';
import { LoginButton } from '@/app/login';
import { ClientOnly } from '@/components/client-only';
import { Logo } from '@/components/logo';
import { Button, buttonVariants } from '@/components/ui/button';
import { ChatContainer } from '@/components/ui/chat-container';
import { Message, MessageContent } from '@/components/ui/message';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { PRIVY_COOKIE_NAME } from '@/lib/const';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { useChat, UseChatHelpers } from '@ai-sdk/react';
import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import { useLocalStorage } from '@uidotdev/usehooks';
import { UIMessage } from 'ai';
import 'ios-vibrator-pro-max';
import { ArrowUp, Loader2, Square, SquarePen } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

function renderMessageParts(message: UseChatHelpers['messages'][0]) {
  if (!message.parts || message.parts.length === 0) {
    return (
      <MessageContent className="px-0 md:px-2" markdown>
        {message.content}
      </MessageContent>
    );
  }

  return (
    <>
      {message.parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <MessageContent key={index} className="px-0 md:px-2" markdown>
              {part.text}
            </MessageContent>
          );
        }

        if (part.type === 'tool-invocation') {
          const toolInvocation = part.toolInvocation;

          // Handle different tool invocation states
          switch (toolInvocation.state) {
            case 'partial-call':
            case 'call':
              return (
                <div key={index} className="animate-pulse rounded-md flex">
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" />
                    Thinking...
                  </div>
                </div>
              );

            default:
              return null;
          }
        }

        if (part.type === 'reasoning') {
          return null; // We handle reasoning separately
        }

        return null;
      })}
    </>
  );
}

function ChatWithCustomScroll({
  messages,
  status,
  ref,
}: {
  messages: UseChatHelpers['messages'];
  status: UseChatHelpers['status'];
  ref?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <ChatContainer
      ref={ref}
      autoScroll
      className="relative group flex flex-col justify-center w-full max-w-3xl md:px-4 pb-2 gap-2 items-end"
    >
      {messages.map(message => {
        const isAssistant = message.role === 'assistant';

        return (
          <Message
            key={message.id}
            className={cn(
              message.role === 'user'
                ? 'justify-end'
                : 'justify-start max-w-none w-full',
              'py-2',
            )}
          >
            {isAssistant ? (
              renderMessageParts(message)
            ) : (
              <MessageContent className="bg-primary w-full text-primary-foreground whitespace-normal">
                {message.parts
                  .map(a => {
                    if (a.type === 'text') {
                      return a.text;
                    }
                  })
                  .join('') || message.content}
              </MessageContent>
            )}
          </Message>
        );
      })}
      {status === 'submitted' && (
        <Message key="loading" className="justify-start max-w-none w-full py-2">
          <div className="animate-pulse rounded-md flex">
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin h-4 w-4" />
              Thinking...
            </div>
          </div>
        </Message>
      )}
      <div style={{ paddingBottom: '80px', width: '100%' }} />
    </ChatContainer>
  );
}

function Input({
  input,
  setInput,
  isLoading,
  handleSubmit,
  stop,
}: {
  input: UseChatHelpers['input'];
  isLoading: boolean;
  handleSubmit: UseChatHelpers['handleSubmit'];
  setInput: UseChatHelpers['setInput'];
  stop: UseChatHelpers['stop'];
}) {
  return (
    <PromptInput
      value={input}
      onValueChange={setInput}
      isLoading={isLoading}
      onSubmit={handleSubmit}
      className="w-full rounded-sm"
    >
      <PromptInputTextarea placeholder="Ask me anything..." />
      <PromptInputActions className="justify-end pt-2">
        <PromptInputAction
          tooltip={isLoading ? 'Stop generation' : 'Send message'}
        >
          <Button
            disabled={input.length === 0 && !isLoading}
            variant="default"
            size="icon"
            className="h-6 w-6 rounded-sm"
            onClick={() => {
              if ('vibrate' in navigator) {
                navigator.vibrate(50);
              }
              isLoading ? stop() : handleSubmit();
            }}
          >
            {isLoading ? (
              <Square className="size-4 fill-current" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </Button>
        </PromptInputAction>
      </PromptInputActions>
    </PromptInput>
  );
}

function ChatPage() {
  const [privyToken] = useLocalStorage('privy:token', '');
  const containerRef = useRef(null);
  const { login, authenticated } = usePrivy();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const chatId = params.id as string;
  const initialMessage = searchParams.get('message');
  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] =
    useState(false);
  const [isNewChat, setIsNewChat] = useState(searchParams.get('newChat'));

  const trpc = useTRPC();
  const { data, error } = useQuery(
    trpc.getUserChatMessages.queryOptions(
      { id: chatId },
      {
        enabled: !!chatId && authenticated && !isNewChat,
        refetchOnWindowFocus: false,
        retry: false,
        throwOnError: false,
      },
    ),
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
    api: `/api/chat`,
    headers: {
      [PRIVY_COOKIE_NAME]: privyToken,
    },
    experimental_prepareRequestBody: body => ({
      id: body.id,
      message: body.messages.at(-1),
    }),
    onError: error => {
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
                      <Button onClick={startNewChat} variant="outline">
                        <SquarePen />
                      </Button>
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
                  <div className="relative w-full sm:px-5 px-2 pb-2 sm:pb-4">
                    <div className="bottom-0 mb-[env(safe-area-inset-bottom)] w-full text-base flex flex-col gap-2 items-center justify-center relative z-10">
                      <Input
                        input={input}
                        isLoading={
                          status === 'streaming' || status === 'submitted'
                        }
                        handleSubmit={e => {
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
                    <div className="absolute bottom-0 w-[calc(100%-2rem)] h-full rounded-t-[40px] bg-background" />
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

export const runtime = 'edge';
