'use client';
import type React from 'react';

import { useChat, type Message } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Trash2Icon } from 'lucide-react';
import { ModelSelector, ModelValues } from '@/components/model-selector';
import { Logo } from '@/components/logo';
import { CopyButton } from '@/components/copy-button';
import { Markdown } from '@/components/markdown';
import { useLocalStorage } from '@uidotdev/usehooks';
import { API_URL, CF_BACKEND_HEADER_NAME, CF_COOKIE_NAME } from '@/lib/const';
import { Header } from '@/components/header';
import { toast } from 'sonner';
import { useMemo, useRef } from 'react';
import { AutosizeTextarea } from '@/components/ui/autosize-textarea';
import { Drawer } from 'vaul';
import { useCookie } from '@/hooks/use-cookie';

const PLACEHOLDER_PROMPT = 'You are a helpful AI assistant.';

function parseMessageWithSources(content: string, sources: string[]) {
  if (!sources.length) return content; // No sources, return raw content

  // Replace [1], [2], etc. with hyperlinks to the corresponding source
  return content.replace(/\[(\d+)\]/g, (match, number) => {
    const index = parseInt(number, 10) - 1; // Convert to 0-based index
    if (index >= 0 && index < sources.length) {
      const source = sources[index];
      return `[${number}](${source})`;
    }
    return match; // If index is invalid, leave it unchanged
  });
}

interface MessageWithMeta extends Message {
  sources?: string[];
  tweet?: string | null;
}

export function UserChat() {
  const cfAuthorizationCookie = useCookie(CF_COOKIE_NAME);
  const [model, setModel] = useLocalStorage<ModelValues>(
    'userChatSelectedChatModel',
    'gpt-4.1-nano',
  );
  const [systemPrompt, setSystemPrompt] = useLocalStorage(
    'userChatSystemPrompt',
    PLACEHOLDER_PROMPT,
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialMessages = useMemo(() => {
    const messages = [
      {
        id: 'system',
        role: 'system',
        content: systemPrompt,
      },
    ] as Message[];

    return messages;
  }, [systemPrompt]);

  const {
    messages,
    input,
    handleInputChange,
    isLoading,
    stop,
    handleSubmit,
    setMessages,
    data,
    reload,
  } = useChat({
    api: `${API_URL}/api/userchat`,
    body: {
      selectedChatModel: model,
    },
    headers: { [CF_BACKEND_HEADER_NAME]: cfAuthorizationCookie },
    onError: error => {
      toast.error(error.message, {
        dismissible: false,
        action: {
          label: 'Retry',
          onClick: () => reload(),
        },
      });
    },
    initialMessages,
  });

  // Inside Chat component
  const messagesWithMeta = useMemo(() => {
    // Filter data for sources and tweets
    // @ts-expect-error we can ignore because BE adds these
    const sourcesData = data?.filter(d => d?.role === 'sources') || [];
    // @ts-expect-error we can ignore because BE adds these
    const tweetsData = data?.filter(d => d?.role === 'tweet') || [];

    let sourceIndex = 0;
    let tweetIndex = 0;

    // Process messages in one pass
    return messages.map((message): MessageWithMeta => {
      if (message.role === 'system') {
        return { ...message, sources: [], tweet: null };
      }
      if (message.role === 'assistant') {
        // @ts-expect-error we can ignore because BE adds these
        const sources = sourcesData[sourceIndex]?.content || [];
        sourceIndex++;
        return { ...message, sources, tweet: null };
      }
      if (message.role === 'user') {
        // @ts-expect-error we can ignore because BE adds these
        const tweet = tweetsData[tweetIndex]?.content || null;
        tweetIndex++;
        return { ...message, sources: [], tweet };
      }
      return { ...message, sources: [], tweet: null };
    });
  }, [messages, data]);

  const handleSystemPromptChange = (text: string) => {
    setSystemPrompt(text);
    // Reset chat with new system prompt
    const messages = [
      {
        id: 'system',
        role: 'system',
        content: text.trim(),
      },
    ] as Message[];

    setMessages(messages);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'system',
        role: 'system',
        content: systemPrompt,
      },
    ]);
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        right={
          <div className="flex gap-2">
            <ModelSelector value={model} setValue={setModel} />
            <Button
              variant="outline"
              disabled={messages.length < 2}
              size="sm"
              onClick={handleClearChat}
            >
              <Trash2Icon />
            </Button>
          </div>
        }
      />
      {/* Expandable System Prompt Area */}
      <Accordion type="single" collapsible className="w-full sticky">
        <AccordionItem value="system-prompt" className="border-b-0">
          <AccordionTrigger className="px-4 py-2 border-secondary-foreground/30 bg-secondary hover:no-underline">
            <span className="text-sm font-medium text-secondary-foreground">
              System Prompt
            </span>
          </AccordionTrigger>
          <AccordionContent className="bg-secondary px-4 pt-1 pb-4">
            <Textarea
              value={systemPrompt}
              onChange={e => handleSystemPromptChange(e.target.value)}
              placeholder="Enter system message..."
              className="min-h-[100px] border-secondary-foreground/30 bg-primary-foreground text-secondary-foreground resize-y max-h-[50vh]"
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Scrollable Messages Area */}
      <ScrollArea className="flex-1 w-full md:max-w-4xl mx-auto max-h-[calc(100vh-12rem)]">
        <div className="flex flex-col gap-4 p-4">
          {messagesWithMeta
            .filter(message => message.id !== 'userPersistent')
            .filter(message => message.role !== 'system')
            .map(message => {
              const content = parseMessageWithSources(
                message.content,
                message.sources || [],
              );
              const reasoning = message.parts
                ?.filter(p => p.type === 'reasoning')
                .map(p => p.reasoning)
                .join('\n');

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                    'w-full',
                  )}
                >
                  <div
                    className={cn(
                      'mx-2 text-wrap whitespace-nowrap',
                      message.role === 'user' ? 'max-w-[70%]' : 'w-full',
                    )}
                  >
                    <div
                      className={cn(
                        'relative group flex flex-col',
                        message.role === 'user' ? 'items-end' : 'items-start',
                      )}
                    >
                      <div className="flex gap-2">
                        {message.role === 'assistant' && (
                          <span>
                            <Logo className="h-[30px] w-[30px] rounded-full" />
                          </span>
                        )}
                        <div
                          className={cn(
                            message.role === 'user'
                              ? 'bg-secondary text-primary rounded-br-none px-3 py-2 rounded-md' // Different corner for user
                              : 'max-w-full', // Different corner for assistant
                          )}
                        >
                          <Markdown>{content}</Markdown>
                        </div>
                      </div>
                      <div
                        className={cn(
                          message.role === 'user' ? 'flex-row-reverse' : '',
                          'flex gap-2 items-center mt-2',
                          'opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center',
                        )}
                      >
                        {!isLoading && (
                          <div
                            className={cn(
                              message.role === 'assistant' ? 'ml-8' : '',
                            )}
                          >
                            <CopyButton value={content} />
                          </div>
                        )}
                        {message?.tweet && (
                          <Drawer.Root direction="right">
                            <Drawer.Trigger>
                              <Button variant="outline" size="sm">
                                View Tweet Content
                              </Button>
                            </Drawer.Trigger>
                            <Drawer.Portal>
                              <Drawer.Overlay className="fixed inset-0 bg-black/60 z-10" />
                              <Drawer.Content
                                className="right-2 rounded-2xl top-2 bottom-2 fixed bg-primary-foreground z-10 outline-none max-w-lg flex overflow-y-auto"
                                // The gap between the edge of the screen and the drawer is 8px in this case.
                                style={
                                  {
                                    '--initial-transform': 'calc(100% + 8px)',
                                  } as React.CSSProperties
                                }
                              >
                                <div className="bg-primary-foreground h-full w-full grow p-5 flex flex-col rounded-2xl">
                                  <div className="max-w-xl mx-auto">
                                    <Drawer.Title className="font-bold text-lg mb-2 text-primary">
                                      Extracted Tweet content
                                    </Drawer.Title>
                                    <Drawer.Description className="text-primary mb-2 overflow-y-scroll">
                                      <Markdown>{message.tweet}</Markdown>
                                    </Drawer.Description>
                                    <CopyButton
                                      className="-ml-1 mb-4"
                                      value={message.tweet}
                                    />
                                  </div>
                                </div>
                              </Drawer.Content>
                            </Drawer.Portal>
                          </Drawer.Root>
                        )}
                        {reasoning && (
                          <Drawer.Root direction="right">
                            <Drawer.Trigger>
                              <Button variant="outline" size="sm">
                                Reasoning
                              </Button>
                            </Drawer.Trigger>
                            <Drawer.Portal>
                              <Drawer.Overlay className="fixed inset-0 bg-black/60 z-10" />
                              <Drawer.Content
                                className="right-2 rounded-2xl top-2 bottom-2 fixed bg-primary-foreground z-10 outline-none max-w-lg flex overflow-y-auto"
                                // The gap between the edge of the screen and the drawer is 8px in this case.
                                style={
                                  {
                                    '--initial-transform': 'calc(100% + 8px)',
                                  } as React.CSSProperties
                                }
                              >
                                <div className="bg-primary-foreground h-full w-full grow p-5 flex flex-col rounded-2xl">
                                  <div className="max-w-xl mx-auto">
                                    <Drawer.Title className="font-bold text-lg mb-2 text-primary">
                                      Reasoning
                                    </Drawer.Title>
                                    <Drawer.Description className="text-primary mb-2 overflow-y-scroll">
                                      <Markdown>{`${reasoning} ${
                                        message?.sources
                                          ? message?.sources
                                              .map(s => `\n- ${s}`)
                                              .join('\n')
                                          : ''
                                      }`}</Markdown>
                                    </Drawer.Description>
                                    <CopyButton
                                      className="-ml-1 mb-4"
                                      value={reasoning}
                                    />
                                  </div>
                                </div>
                              </Drawer.Content>
                            </Drawer.Portal>
                          </Drawer.Root>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div
              className={cn(
                'mx-2 px-3 py-2 rounded-md',
                'flex justify-start w-full',
                'gap-2 items-center',
              )}
            >
              <span>
                <Logo className="h-[30px] w-[30px] rounded-full" />
              </span>
              <Loader2 className="animate-spin" size={20} />
            </div>
          )}
          <div
            ref={messagesEndRef}
            className="shrink-0 min-w-[24px] min-h-[24px]"
          />
        </div>
      </ScrollArea>
      {/* Input Area */}
      <div className="p-4 border-t border-secondary-foreground/30 sticky bottom-0 z-10 bg-background">
        <div className="w-full md:max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <AutosizeTextarea
              disabled={isLoading}
              value={input}
              maxHeight={200}
              onSend={() => {
                if (isLoading) return;
                if (!input) return;
                if (input.trim().length === 0) return;

                messagesEndRef?.current?.scrollIntoView({
                  behavior: 'instant',
                  block: 'end',
                });
                handleSubmit();
              }}
              onChange={handleInputChange}
              placeholder="Enter user message..."
              className="flex-1 resize-none border-secondary-foreground/30 bg-primary-foreground text-secondary-foreground"
            />
            {isLoading ? (
              <Button onClick={stop}>Stop</Button>
            ) : (
              <Button
                disabled={isLoading || !input || input.trim().length === 0}
                type="submit"
              >
                Send
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
