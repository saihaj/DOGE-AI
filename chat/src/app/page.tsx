'use client';
import 'ios-vibrator-pro-max';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { Square, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { generateId } from 'ai';
import { toast } from 'sonner';
import { usePrivy } from '@privy-io/react-auth';
import { useRef, useState } from 'react';
import { ClientOnly } from '@/components/client-only';
import { PromptSuggestion } from '@/components/ui/prompt-suggestion';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { LoginButton } from './login';
import { useRateLimit } from '@/components/providers';
import { Badge } from '@/components/ui/badge';
import { TextLoop } from '@/components/ui/text-loop';

function Input({
  input,
  setInput,
  isLoading,
  handleSubmit,
}: {
  input: string;
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  setInput: (value: string) => void;
}) {
  return (
    <PromptInput
      value={input}
      onValueChange={setInput}
      isLoading={isLoading}
      onSubmit={() => {
        const syntheticEvent = {
          preventDefault: () => {},
          currentTarget: document.createElement('form'),
        } as React.FormEvent<HTMLFormElement>;
        handleSubmit(syntheticEvent);
      }}
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
              if (!isLoading) {
                const syntheticEvent = {
                  preventDefault: () => {},
                  currentTarget: document.createElement('form'),
                } as React.FormEvent<HTMLFormElement>;
                handleSubmit(syntheticEvent);
              }
            }}
          >
            {isLoading ? (
              <Square className="h-4 w-4 fill-current" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </PromptInputAction>
      </PromptInputActions>
    </PromptInput>
  );
}

const SUGGESTED_PROMPTS = [
  {
    value: `What's in H.R. 4671?`,
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
  const containerRef = useRef(null);
  const { login, authenticated } = usePrivy();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { reachedLimitForTheDay } = useRateLimit();

  // Start a new chat with a new ID
  const startNewChat = (messageContent: string) => {
    if (reachedLimitForTheDay) {
      toast.error('You have reached your daily message limit.');
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

    const newId = generateId();
    router.push(
      `/chat/${newId}?message=${encodeURIComponent(messageContent)}&newChat=true`,
    );
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();

    if (input.trim()) {
      setIsLoading(true);
      try {
        startNewChat(input);
      } catch (error) {
        setIsLoading(false);
        toast.error('Failed to start chat');
      }
    }
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
                    <LoginButton />
                  </div>
                </div>
              </header>
              <div className="relative w-full flex flex-col items-center pt-4 pb-4">
                <div className="w-full max-w-3xl flex flex-col items-center">
                  {reachedLimitForTheDay && (
                    <Badge className="bg-red-700">
                      You have reached your daily message limit.
                    </Badge>
                  )}
                  <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <TextLoop
                      interval={5}
                      className="text-2xl md:text-4xl font-bold mb-8 text-balance"
                    >
                      <span className="gradient-america text-transparent bg-clip-text">
                        What do you want exposed?
                      </span>
                      <span className="gradient-america text-transparent bg-clip-text">
                        What are we digging into today?
                      </span>
                      <span className="gradient-america text-transparent bg-clip-text">
                        What needs investigating?
                      </span>
                      <span className="gradient-america text-transparent bg-clip-text">
                        Ask it. I’ll show you the receipts.
                      </span>
                      <span className="gradient-america text-transparent bg-clip-text">
                        You ask. I find the waste.
                      </span>
                    </TextLoop>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 mx-auto inset-x-0 max-w-(--breakpoint-md) z-40">
              <div className="relative z-40 flex flex-col items-center w-full">
                <div style={{ opacity: 1, transform: 'none' }} />
                <div className="relative w-full sm:px-5 px-2 pb-2 sm:pb-4">
                  <div className="bottom-0 mb-[env(safe-area-inset-bottom)] w-full text-base flex flex-col gap-2 items-center justify-center relative z-10">
                    <AnimatePresence>
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
                              className="md:py-2 py-0 md:px-4 px-2 text-xs md:text-sm"
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
                                startNewChat(value);
                              }}
                            >
                              {value}
                            </PromptSuggestion>
                          </motion.div>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                    <Input
                      input={input}
                      isLoading={isLoading}
                      handleSubmit={handleSubmit}
                      setInput={setInput}
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
