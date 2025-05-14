'use client';
import 'ios-vibrator-pro-max';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { Square, ArrowUp, Loader2, SquarePen } from 'lucide-react';
import { Message, MessageContent } from '@/components/ui/message';
import { Button } from '@/components/ui/button';
import { ChatContainer } from '@/components/ui/chat-container';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { PRIVY_COOKIE_NAME } from '@/lib/const';
import { useChat, UseChatHelpers } from '@ai-sdk/react';
import { toast } from 'sonner';
import { usePrivy } from '@privy-io/react-auth';
import { useRef } from 'react';
import { useLocalStorage } from '@uidotdev/usehooks';
import { ClientOnly } from '@/components/client-only';
import { PromptSuggestion } from '@/components/ui/prompt-suggestion';
import { AnimatePresence, motion } from 'motion/react';
import { LoginButton } from './login';

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
              {message.content}
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
                {message.content}
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

const SUGGESTED_PROMPTS = [
  {
    value: 'What’s in H.R. 4671?',
  },
  {
    value: 'Which agencies are giving out the most duplicative grants',
  },
  {
    value: 'Give me 3 recent bills',
  },
  {
    value: 'What is the save act?',
  },
  {
    value: 'How much has DOGE saved so far?',
  },
];

function Home() {
  const [privyToken] = useLocalStorage('privy:token', '');
  const conatinerRef = useRef(null);
  const { login, authenticated } = usePrivy();
  const {
    messages,
    input,
    setInput,
    stop,
    handleSubmit,
    reload,
    status,
    append,
    setMessages,
  } = useChat({
    api: `/api/chat`,
    body: {
      selectedChatModel: 'gpt-4.1',
    },
    headers: {
      [PRIVY_COOKIE_NAME]: privyToken,
    },
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

  return (
    <div className="flex w-full h-full" data-testid="global-drop">
      <div className="flex w-full h-full overflow-hidden @container/mainview">
        <main className="h-dvh flex-grow flex-shrink relative selection:bg-highlight w-0 @container isolate">
          <div className="relative flex flex-col items-center h-full @container/main">
            <div
              ref={conatinerRef}
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
                      <Button
                        disabled={messages.length === 0}
                        onClick={() => {
                          if ('vibrate' in navigator) {
                            navigator.vibrate(50);
                          }
                          stop();
                          setMessages([]);
                        }}
                        variant="outline"
                      >
                        <SquarePen />
                      </Button>
                    )}
                    <ClientOnly>
                      <LoginButton />
                    </ClientOnly>
                  </div>
                </div>
              </header>
              <div className="relative w-full flex flex-col items-center pt-4 pb-4">
                <div className="w-full max-w-3xl flex flex-col">
                  <ChatWithCustomScroll
                    ref={conatinerRef}
                    status={status}
                    messages={messages}
                  />
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 mx-auto inset-x-0 max-w-(--breakpoint-md) z-40">
              <div className="relative z-40 flex flex-col items-center w-full">
                <div style={{ opacity: 1, transform: 'none' }} />
                <div className="relative w-full sm:px-5 px-2 pb-2 sm:pb-4">
                  <div className="bottom-0 mb-[env(safe-area-inset-bottom)] w-full text-base flex flex-col gap-2 items-center justify-center relative z-10">
                    <AnimatePresence>
                      {input.length === 0 && messages.length === 0 && (
                        <motion.div className="flex flex-wrap gap-2">
                          {SUGGESTED_PROMPTS.map(({ value }, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{
                                opacity: 1,
                                y: 0,
                                transition: {
                                  delay: i * 0.1, // Staggered delay
                                  duration: 0.3,
                                },
                              }}
                              exit={{
                                opacity: 0,
                                y: 10,
                                transition: {
                                  delay: i * 0.05, // Faster staggered exit
                                  duration: 0.2,
                                },
                              }}
                            >
                              <PromptSuggestion
                                key={i}
                                onClick={() => {
                                  if (!authenticated) {
                                    toast.error('Please login to continue', {
                                      action: {
                                        label: 'Login',
                                        onClick: login,
                                      },
                                    });
                                    return;
                                  }
                                  append({
                                    content: value,
                                    role: 'user',
                                  });
                                }}
                              >
                                {value}
                              </PromptSuggestion>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
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
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <Home />
    </ClientOnly>
  );
}
