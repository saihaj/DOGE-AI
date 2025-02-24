'use client';
import type React from 'react';

import { useChat, type Message } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import { Loader2, Search, Trash2Icon } from 'lucide-react';
import { ModelSelector, ModelValues } from '@/components/model-selector';
import { Logo } from '@/components/logo';
import { CopyButton } from '@/components/copy-button';
import { Markdown } from '@/components/markdown';
import { useLocalStorage } from '@uidotdev/usehooks';
import { API_URL } from '@/lib/const';
import { Header } from '@/components/header';
import { toast } from 'sonner';
import { Toggle } from '@/components/ui/toggle';
import { useMemo } from 'react';

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

export function Chat() {
  const [model, setModel] = useLocalStorage<ModelValues>(
    'playgroundSelectedChatModel',
    'o3-mini',
  );
  const [billSearch, setBillSearch] = useLocalStorage('billSearch', true);
  const [systemPrompt, setSystemPrompt] = useLocalStorage(
    'playgroundSystemPrompt',
    PLACEHOLDER_PROMPT,
  );
  const [userPrompt, setUserPrompt] = useLocalStorage(
    'playgroundUserPrompt',
    '',
  );
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

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
    api: `${API_URL}/api/chat`,
    body: {
      selectedChatModel: model,
      billSearch,
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
    initialMessages: [
      {
        id: 'system',
        role: 'system',
        content: systemPrompt,
      },
    ],
  });

  const assistantMessages = useMemo(
    () => messages.filter(message => message.role === 'assistant'),
    [messages],
  );

  // Process messages and attach sources from the data stream
  const assistantMessagesWithSources = useMemo(
    () =>
      assistantMessages.map((message, index) => {
        const relativeData = data?.[index];

        // TODO: how can we type these better?
        const sources = (() => {
          // @ts-expect-error we can ignore because BE adds these
          if (relativeData?.role === 'sources') {
            // @ts-expect-error we can ignore because BE adds these
            return relativeData?.content || [];
          }
          return [];
        })();

        return {
          ...message,
          sources,
        };
      }),
    [assistantMessages, data],
  );

  const messagesWithSources = useMemo(
    () =>
      messages.map(message => {
        if (message.role === 'assistant') {
          const assistantMessage = assistantMessagesWithSources.find(
            m => m.id === message.id,
          );

          if (assistantMessage) {
            return assistantMessage;
          }
        }

        return {
          ...message,
          sources: [],
        };
      }),
    [assistantMessagesWithSources, messages],
  );

  const handleSystemPromptChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setSystemPrompt(e.target.value);
    // Reset chat with new system prompt
    const messages = [
      {
        id: 'system',
        role: 'system',
        content: e.target.value,
      },
    ] as Message[];

    if (userPrompt) {
      messages.push({
        id: 'userPersistent',
        role: 'user',
        content: userPrompt,
      });
    }

    setMessages(messages);
  };

  const handleUserPromptChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setUserPrompt(e.target.value);
    // Reset chat with new system prompt
    setMessages([
      {
        id: 'system',
        role: 'system',
        content: systemPrompt,
      },
      {
        id: 'userPersistent',
        role: 'user',
        content: e.target.value,
      },
    ]);
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
              System message
            </span>
          </AccordionTrigger>
          <AccordionContent className="bg-secondary px-4 pt-1 pb-4">
            <Textarea
              value={systemPrompt}
              onChange={handleSystemPromptChange}
              placeholder="Enter system message..."
              className="min-h-[100px] border-secondary-foreground/30 bg-primary-foreground text-secondary-foreground resize-y max-h-[50vh]"
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Expandable User Prompt Area */}
      <Accordion type="single" collapsible className="w-full sticky">
        <AccordionItem value="system-prompt" className="border-b-0">
          <AccordionTrigger className="px-4 py-2 border-secondary-foreground/30 bg-secondary hover:no-underline">
            <span className="text-sm font-medium text-secondary-foreground">
              User message
            </span>
          </AccordionTrigger>
          <AccordionContent className="bg-secondary px-4 pt-1 pb-4">
            <Textarea
              value={userPrompt}
              onChange={handleUserPromptChange}
              placeholder="Enter user message..."
              className="min-h-[100px] border-secondary-foreground/30 bg-primary-foreground text-secondary-foreground resize-y max-h-[50vh]"
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Scrollable Messages Area */}
      <ScrollArea className="flex-1 w-full md:max-w-4xl mx-auto max-h-[calc(100vh-10rem)]">
        <div className="flex flex-col gap-4 p-4" ref={messagesContainerRef}>
          {messagesWithSources
            .filter(message => message.id !== 'userPersistent')
            .filter(message => message.role !== 'system')
            .map(message => {
              const content = parseMessageWithSources(
                message.content,
                message.sources,
              );
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
                      'max-w-[70%] mx-2 text-wrap whitespace-nowrap', // Added margin
                      'px-3 py-2 rounded-md',
                      message.role === 'user'
                        ? 'bg-secondary text-primary rounded-br-none' // Different corner for user
                        : 'max-w-full', // Different corner for assistant
                    )}
                  >
                    <div>
                      <div className="flex gap-2 items-start flex-col">
                        {message.role === 'assistant' && (
                          <span>
                            <Logo className="h-[30px] w-[30px] rounded-full" />
                          </span>
                        )}
                        <Markdown>{content}</Markdown>
                      </div>
                      {!isLoading && message.role === 'assistant' && (
                        <div className="-ml-2 flex items-center">
                          <CopyButton value={content} />
                        </div>
                      )}
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
            <Toggle
              pressed={billSearch}
              onPressedChange={v => setBillSearch(v)}
              variant="outline"
              aria-label="Toggle bill search"
            >
              <Search />
              Bill Search
            </Toggle>
            <Input
              disabled={isLoading}
              value={input}
              onChange={handleInputChange}
              placeholder="Enter user message..."
              className="flex-1  border-secondary-foreground/30 bg-primary-foreground text-secondary-foreground"
            />
            {isLoading ? (
              <Button onClick={stop}>Stop</Button>
            ) : (
              <Button disabled={isLoading || input.length <= 0} type="submit">
                Send
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
