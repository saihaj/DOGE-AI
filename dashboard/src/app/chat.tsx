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
import {
  BookIcon,
  Database,
  Globe,
  Loader2,
  Search,
  Settings,
  Trash2Icon,
} from 'lucide-react';
import { ModelSelector, ModelValues } from '@/components/model-selector';
import { Logo } from '@/components/logo';
import { CopyButton } from '@/components/copy-button';
import { Markdown } from '@/components/markdown';
import { useLocalStorage } from '@uidotdev/usehooks';
import { API_URL, CF_BACKEND_HEADER_NAME, CF_COOKIE_NAME } from '@/lib/const';
import { Header } from '@/components/header';
import { toast } from 'sonner';
import { Toggle } from '@/components/ui/toggle';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AutosizeTextarea } from '@/components/ui/autosize-textarea';
import { Drawer } from 'vaul';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

/**
 * given a string
 * "I am helpful agent. Let me {{var}} help you"
 * it extracts out {{var}} and returns as a JS object
 * {var: ""}
 */
function extractTemplate(content: string) {
  const template = content.match(/{{(.*?)}}/g);
  const result: { [key: string]: string } = {};

  if (template) {
    template.forEach(t => {
      const key = t.replace(/{{|}}/g, '');
      result[key] = '';
    });
  }

  return result;
}

/**
 * Given a prompt template and variables, it fills the template with the variables
 * and returns the filled text
 */
function fillTemplate({
  prompt,
  variables,
}: {
  prompt: string;
  variables: Record<string, string>;
}) {
  let text = prompt;
  Object.keys(variables).forEach(varName => {
    const value = variables[varName] || `[${varName}]`;
    text = text.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value);
  });
  return text;
}

function TemplatePromptWithVars({
  initialText,
  onChange,
  label,
}: {
  initialText: string;
  onChange: (text: string, variables: Record<string, string>) => void;
  label: string;
}) {
  const [text, setText] = useState<string>(initialText);
  // const [variables, setVariables] = useState<Record<string, string>>({});
  const [variables, setVariables] = useLocalStorage<Record<string, string>>(
    `playground${label.replace(' ', '').trim().toLowerCase()}PromptVars`,
    {},
  );
  useEffect(() => {
    const extracted = extractTemplate(text);
    setVariables(prev => {
      const newVars: Record<string, string> = {};
      Object.keys(extracted).forEach(key => {
        newVars[key] = prev[key] !== undefined ? prev[key] : '';
      });
      return newVars;
    });
  }, [setVariables, text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    if (onChange) {
      onChange(newText, variables);
    }
  };

  const handleVarValueChange = (varName: string, value: string) => {
    setVariables(prev => {
      const updatedVars = { ...prev, [varName]: value };
      if (onChange) {
        onChange(text, updatedVars);
      }
      return updatedVars;
    });
  };

  const detectedVars = Object.keys(variables);

  return (
    <Accordion type="single" collapsible className="w-full sticky">
      <AccordionItem value="system-prompt" className="border-b-0">
        <AccordionTrigger className="px-4 py-2 border-secondary-foreground/30 bg-secondary hover:no-underline">
          <span className="text-sm font-medium text-secondary-foreground">
            {label}
          </span>
        </AccordionTrigger>
        <AccordionContent className="bg-secondary px-4 pt-1 pb-4">
          <Textarea
            value={text}
            onChange={handleTextChange}
            placeholder="Enter system message..."
            className="min-h-[100px] border-secondary-foreground/30 bg-primary-foreground text-secondary-foreground resize-y max-h-[50vh]"
          />
          {detectedVars.length > 0 && (
            <Drawer.Root direction="right">
              <Drawer.Trigger asChild>
                <Button variant="outline" size="sm" className="mt-2">
                  Configure {detectedVars.length} Variables
                </Button>
              </Drawer.Trigger>
              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/60 z-10" />
                <Drawer.Content
                  className="right-2 rounded-2xl top-2 bottom-2 fixed bg-primary-foreground z-10 outline-none w-1/3 flex overflow-y-auto"
                  // The gap between the edge of the screen and the drawer is 8px in this case.
                  style={
                    {
                      '--initial-transform': 'calc(100% + 8px)',
                    } as React.CSSProperties
                  }
                >
                  <div className="bg-primary-foreground h-full w-full grow p-5 flex flex-col rounded-2xl">
                    <Drawer.Title className="font-bold text-lg mb-2 text-primary">
                      Variable Values
                    </Drawer.Title>
                    {detectedVars.map((varName, index) => (
                      <div key={index} className="flex flex-col gap-2 mb-4">
                        <Label className="font-mono" htmlFor={`var-${varName}`}>
                          {varName}
                        </Label>
                        <Textarea
                          id={`var-${varName}`}
                          value={variables[varName] || ''}
                          onChange={e =>
                            handleVarValueChange(varName, e.target.value)
                          }
                          placeholder={`Enter value for ${varName}`}
                        />
                      </div>
                    ))}
                  </div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function Chat() {
  const cfAuthorizationCookie = useCookie(CF_COOKIE_NAME);
  const [model, setModel] = useLocalStorage<ModelValues>(
    'playgroundSelectedChatModel',
    'o3-mini',
  );
  const [billSearch, setBillSearch] = useLocalStorage('billSearch', true);
  const [documentSearch, setDocumentSearch] = useLocalStorage(
    'documentSearch',
    true,
  );
  const [webSearch, setWebSearch] = useLocalStorage('webSearch', true);
  const [manualKbSearch, setManualKbSearch] = useLocalStorage(
    'manualKbSearch',
    true,
  );
  const [systemPrompt, setSystemPrompt] = useLocalStorage(
    'playgroundSystemPrompt',
    PLACEHOLDER_PROMPT,
  );
  const [systemPromptTemplate, setSystemPromptTemplate] = useLocalStorage(
    'playgroundSystemPromptTemplate',
    PLACEHOLDER_PROMPT,
  );
  const [userPrompt, setUserPrompt] = useLocalStorage(
    'playgroundUserPrompt',
    '',
  );
  const [userPromptTemplate, setUserPromptTemplate] = useLocalStorage(
    'playgroundUserPromptTemplate',
    '',
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

    if (userPrompt) {
      messages.push({
        id: 'userPersistent',
        role: 'user',
        content: userPrompt,
      });
    }

    return messages;
  }, [systemPrompt, userPrompt]);

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
      documentSearch,
      manualKbSearch,
      webSearch,
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

  const assistantMessages = useMemo(
    () => messages.filter(message => message.role === 'assistant'),
    [messages],
  );

  const userMessages = useMemo(
    () => messages.filter(message => message.role === 'user'),
    [messages],
  );

  // Process messages and attach tweets from the data stream
  const userMessagesWithTweets = useMemo(() => {
    // @ts-expect-error we can ignore because BE adds these
    const extractedTweets = data?.filter(d => d?.role === 'tweet') || [];

    return userMessages.map((message, index) => {
      const relativeData = extractedTweets?.[index];

      // TODO: how can we type these better?
      // @ts-expect-error we can ignore because BE adds these
      const tweet = relativeData?.content || null;

      return {
        ...message,
        tweet,
      };
    });
  }, [userMessages, data]);

  // Process messages and attach sources from the data stream
  const assistantMessagesWithSources = useMemo(() => {
    // @ts-expect-error we can ignore because BE adds these
    const sourcesData = data?.filter(d => d?.role === 'sources') || [];

    return assistantMessages.map((message, index) => {
      const relativeData = sourcesData?.[index];

      // TODO: how can we type these better?
      // @ts-expect-error we can ignore because BE adds these
      const sources = relativeData?.content || [];

      return {
        ...message,
        sources,
      };
    });
  }, [assistantMessages, data]);

  const messagesWithSources = useMemo(
    () =>
      messages.map(message => {
        if (message.role === 'assistant') {
          const assistantMessage = assistantMessagesWithSources.find(
            m => m.id === message.id,
          );

          if (assistantMessage) {
            return {
              ...assistantMessage,
              tweet: null,
            };
          }
        }

        if (message.role === 'user') {
          const userMessage = userMessagesWithTweets.find(
            m => m.id === message.id,
          );

          if (userMessage) {
            return {
              ...userMessage,
              sources: [],
            };
          }
        }

        return {
          ...message,
          sources: [],
          tweet: null,
        };
      }),
    [assistantMessagesWithSources, messages, userMessagesWithTweets],
  );

  const handleSystemPromptChange = ({
    text,
    variables,
  }: {
    text: string;
    variables: Record<string, string>;
  }) => {
    const prompt = text ? text.trim() : PLACEHOLDER_PROMPT;
    setSystemPromptTemplate(prompt);
    const input = fillTemplate({
      variables,
      prompt,
    });
    setSystemPrompt(input);
    // Reset chat with new system prompt
    const messages = [
      {
        id: 'system',
        role: 'system',
        content: input,
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

  const handleUserPromptChange = ({
    text,
    variables,
  }: {
    text: string;
    variables: Record<string, string>;
  }) => {
    const prompt = text.trim();
    setUserPromptTemplate(prompt);

    const input = fillTemplate({
      variables,
      prompt,
    });
    setUserPrompt(input);

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
        content: input,
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
      <TemplatePromptWithVars
        initialText={systemPromptTemplate}
        onChange={(text, vars) => {
          handleSystemPromptChange({ text, variables: vars });
        }}
        label="System message"
      />

      {/* Expandable User Prompt Area */}
      <TemplatePromptWithVars
        initialText={userPromptTemplate}
        onChange={(text, vars) => {
          handleUserPromptChange({ text, variables: vars });
        }}
        label="User message"
      />

      {/* Scrollable Messages Area */}
      <ScrollArea className="flex-1 w-full md:max-w-4xl mx-auto max-h-[calc(100vh-12rem)]">
        <div className="flex flex-col gap-4 p-4">
          {messagesWithSources
            .filter(message => message.id !== 'userPersistent')
            .filter(message => message.role !== 'system')
            .map(message => {
              const content = parseMessageWithSources(
                message.content,
                message.sources,
              );
              const reasoning = message.parts
                .filter(p => p.type === 'reasoning')
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
                                              // @ts-expect-error we can ignore because BE adds these
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Settings />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="flex flex-col gap-2">
                <Toggle
                  size="sm"
                  pressed={billSearch}
                  onPressedChange={setBillSearch}
                  variant="outline"
                  type="button"
                  aria-label="Toggle bill search"
                >
                  <Search />
                  Bill Search
                </Toggle>
                <Toggle
                  size="sm"
                  type="button"
                  pressed={manualKbSearch}
                  onPressedChange={setManualKbSearch}
                  variant="outline"
                  aria-label="Toggle manual KB search"
                >
                  <BookIcon />
                  Manual KB
                </Toggle>
                <Toggle
                  size="sm"
                  type="button"
                  pressed={documentSearch}
                  onPressedChange={setDocumentSearch}
                  variant="outline"
                  aria-label="Toggle crawled pages search"
                >
                  <Database />
                  Crawled Pages
                </Toggle>
                <Toggle
                  size="sm"
                  type="button"
                  pressed={webSearch}
                  onPressedChange={setWebSearch}
                  variant="outline"
                  aria-label="Toggle internet search"
                >
                  <Globe />
                  Internet
                </Toggle>
              </PopoverContent>
            </Popover>

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
