'use client';
import type React from 'react';

import { useChat, type Message, type UseChatHelpers } from 'ai/react';
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
import { ModelSelector, type ModelValues } from '@/components/model-selector';
import { Logo } from '@/components/logo';
import { CopyButton } from '@/components/copy-button';
import { Markdown } from '@/components/markdown';
import { useLocalStorage } from '@uidotdev/usehooks';
import { API_URL, CF_BACKEND_HEADER_NAME, CF_COOKIE_NAME } from '@/lib/const';
import { Header } from '@/components/header';
import { toast } from 'sonner';
import { useEffect, useMemo, useRef } from 'react';
import { AutosizeTextarea } from '@/components/ui/autosize-textarea';
import { Drawer } from 'vaul';
import { useCookie } from '@/hooks/use-cookie';
import { Badge } from '@/components/ui/badge';

interface MessageWithMeta extends Message {
  sources?: string[];
  tweet?: string | null;
  hasKbAnnotation?: boolean;
}

const PLACEHOLDER_PROMPT = 'You are a helpful AI assistant.';

function parseMessageWithSources(content: string, sources: string[]) {
  if (!sources.length) return content; // No sources, return raw content

  // Replace [1], [2], etc. with hyperlinks to the corresponding source
  return content.replace(/\[(\d+)\]/g, (match, number) => {
    const index = Number.parseInt(number, 10) - 1; // Convert to 0-based index
    if (index >= 0 && index < sources.length) {
      const source = sources[index];
      return `[${number}](${source})`;
    }
    return match; // If index is invalid, leave it unchanged
  });
}

// Update the renderMessageParts function to only show thinking state for the last message
function renderMessageParts(
  message: MessageWithMeta,
  status: UseChatHelpers['status'],
  isLastAssistantMessage: boolean,
) {
  // Only show thinking state if this is the last assistant message and status is submitted or streaming
  if (isLastAssistantMessage && status === 'submitted' && !message.content) {
    return (
      <div className="animate-pulse rounded-md flex">
        <div className="flex items-center gap-2">
          <Loader2 className="animate-spin h-4 w-4" />
          Thinking...
        </div>
      </div>
    );
  }

  if (!message.parts || message.parts.length === 0) {
    return <Markdown>{message.content}</Markdown>;
  }

  return (
    <>
      {message.parts.map((part, index) => {
        if (part.type === 'text') {
          return <Markdown key={index}>{part.text}</Markdown>;
        }

        if (part.type === 'tool-invocation') {
          const toolInvocation = part.toolInvocation;

          // Handle different tool invocation states
          switch (toolInvocation.state) {
            case 'partial-call':
              return (
                <div key={index} className="animate-pulse rounded-md flex">
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" />
                    Preparing {toolInvocation.toolName} tool
                  </div>
                </div>
              );

            case 'call':
              return (
                <div key={index} className="animate-pulse rounded-md flex">
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" />
                    Processing with {toolInvocation.toolName} tool
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

export function UserChat() {
  // Add a style tag for print-specific styles
  useEffect(() => {
    // Create a style element for print-specific styles
    const style = document.createElement('style');
    style.innerHTML = `
  @media print {
    @page {
      margin: 1cm;
      size: auto;
    }
    body {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .print-only {
      display: block !important;
    }
    body.printing [role="region"] {
      max-height: none !important;
      height: auto !important;
      overflow: visible !important;
    }
    .printing .overflow-hidden {
      overflow: visible !important;
    }
  }
`;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    // Function to handle printing
    const handleBeforePrint = () => {
      // Temporarily remove height constraints for printing
      document.body.classList.add('printing');

      // Force all content to be rendered
      const scrollArea = document.querySelector('[role="region"]');
      if (scrollArea) {
        scrollArea.setAttribute(
          'style',
          'max-height: none !important; height: auto !important; overflow: visible !important;',
        );
      }
    };

    const handleAfterPrint = () => {
      // Restore normal view
      document.body.classList.remove('printing');

      // Let the normal styles take over again
      const scrollArea = document.querySelector('[role="region"]');
      if (scrollArea) {
        scrollArea.removeAttribute('style');
      }
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);
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
    stop,
    handleSubmit,
    setMessages,
    data,
    reload,
    status,
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
    // Remove the onToolCall handler since we're using the built-in parts
  });

  useEffect(() => {
    // Function to handle scrolling
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        // Check if user is already near the bottom before scrolling
        const scrollArea = messagesEndRef.current.parentElement;
        if (scrollArea) {
          const isNearBottom =
            scrollArea.scrollHeight -
              scrollArea.scrollTop -
              scrollArea.clientHeight <
            100;

          // Only auto-scroll if user is already near the bottom or if it's a new user message
          if (
            isNearBottom ||
            (messages.length > 0 &&
              messages[messages.length - 1].role === 'user')
          ) {
            messagesEndRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'end',
            });
          }
        } else {
          // Fallback if parent element isn't available
          messagesEndRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
          });
        }
      }
    };

    // Set a small timeout to ensure DOM is updated before scrolling
    const timeoutId = setTimeout(scrollToBottom, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, status]);

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
        const hasKbAnnotation = Boolean(
          message.annotations?.find(
            // @ts-expect-error we can ignore because BE adds these
            a => a.role === 'kb-entry-found',
          ),
        );
        sourceIndex++;
        return { ...message, sources, tweet: null, hasKbAnnotation };
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
    <div className="flex-1 flex flex-col print:block print:overflow-visible print:h-auto">
      <Header
        className="print:hidden"
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
      <Accordion
        type="single"
        collapsible
        className="w-full sticky print:hidden"
      >
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
      <ScrollArea className="flex-1 w-full md:max-w-4xl mx-auto max-h-[calc(100vh-12rem)] print:max-h-none print:overflow-visible print:h-auto">
        <div className="flex flex-col gap-4 p-4 print:p-0">
          {messagesWithMeta
            .filter(message => message.id !== 'userPersistent')
            .filter(message => message.role !== 'system')
            .map((message, index, filteredMessages) => {
              const content = parseMessageWithSources(
                message.content,
                message.sources || [],
              );
              const reasoning = message.parts
                ?.filter(p => p.type === 'reasoning')
                .map(p => p.reasoning)
                .join('\n');

              // Check if this is the last assistant message
              const assistantMessages = filteredMessages.filter(
                m => m.role === 'assistant',
              );
              const isLastAssistantMessage =
                message.role === 'assistant' &&
                message.id ===
                  assistantMessages[assistantMessages.length - 1]?.id;

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                    'w-full',
                    'print:break-inside-avoid print:mb-4 print:text-black',
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
                          <>
                            <span>
                              <Logo className="h-[30px] w-[30px] rounded-full" />
                              {message.hasKbAnnotation && (
                                <Badge
                                  className="bg-green-500"
                                  variant="outline"
                                >
                                  KB
                                </Badge>
                              )}
                            </span>
                          </>
                        )}

                        <div
                          className={cn(
                            message.role === 'user'
                              ? 'bg-secondary text-primary rounded-br-none px-3 py-2 rounded-md' // Different corner for user
                              : 'max-w-full', // Different corner for assistant
                          )}
                        >
                          {renderMessageParts(
                            message,
                            status,
                            isLastAssistantMessage,
                          )}
                        </div>
                      </div>
                      <div
                        className={cn(
                          message.role === 'user' ? 'flex-row-reverse' : '',
                          'flex gap-2 items-center mt-2',
                          'opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center',
                          'print:hidden',
                        )}
                      >
                        {status === 'ready' && (
                          <div
                            className={cn(
                              message.role === 'assistant' ? 'ml-8' : '',
                            )}
                          >
                            <CopyButton value={content} />
                          </div>
                        )}
                        {(message?.sources ?? []).length > 0 && (
                          <Drawer.Root direction="right">
                            <Drawer.Trigger>
                              <Button variant="outline" size="sm">
                                Web results
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
                                      Search results
                                    </Drawer.Title>
                                    <Drawer.Description className="text-primary mb-2 overflow-y-scroll">
                                      <Markdown>
                                        {message.sources
                                          ?.map(t => `- ${t}`)
                                          .join('\n') || ''}
                                      </Markdown>
                                    </Drawer.Description>
                                  </div>
                                </div>
                              </Drawer.Content>
                            </Drawer.Portal>
                          </Drawer.Root>
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

          {/* Add a new assistant message with thinking state when the last message is from user and status is not ready */}
          {status === 'submitted' &&
            messages.length > 0 &&
            messages[messages.length - 1].role === 'user' && (
              <div className={cn('flex justify-start w-full')}>
                <div
                  className={cn('mx-2 text-wrap whitespace-nowrap', 'w-full')}
                >
                  <div
                    className={cn(
                      'relative group flex flex-col',
                      'items-start',
                    )}
                  >
                    <div className="flex gap-2">
                      <span>
                        <Logo className="h-[30px] w-[30px] rounded-full" />
                      </span>
                      <div className="bg-secondary/20 animate-pulse rounded-md flex">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4" />
                          Thinking...
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          <div
            ref={messagesEndRef}
            className="shrink-0 min-w-[24px] min-h-[24px]"
          />
        </div>
      </ScrollArea>
      {/* Input Area */}
      <div className="p-4 border-t border-secondary-foreground/30 sticky bottom-0 z-10 bg-background print:hidden">
        <div className="w-full md:max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <AutosizeTextarea
              disabled={status === 'streaming' || status === 'submitted'}
              value={input}
              maxHeight={200}
              onSend={() => {
                if (status !== 'ready') return;
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
            {status === 'submitted' || status === 'streaming' ? (
              <Button onClick={stop}>Stop</Button>
            ) : (
              <Button
                disabled={!input || input.trim().length === 0}
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
