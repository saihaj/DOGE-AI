'use client';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { Square, ArrowUp } from 'lucide-react';
import { Message, MessageContent } from '@/components/ui/message';
import { Button } from '@/components/ui/button';
import { ChatContainer } from '@/components/ui/chat-container';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';

function ChatWithCustomScroll() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'user',
      content: 'Hello! Can you help me with a coding question?',
    },
    {
      id: 2,
      role: 'assistant',
      content:
        "Of course! I'd be happy to help with your coding question. What would you like to know?",
    },
    {
      id: 3,
      role: 'user',
      content: 'How do I create a responsive layout with CSS Grid?',
    },
    {
      id: 4,
      role: 'assistant',
      content:
        "Creating a responsive layout with CSS Grid is straightforward. Here's a basic example:\n\n```css\n.container {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 1rem;\n}\n```\n\nThis creates a grid where:\n- Columns automatically fit as many as possible\n- Each column is at least 250px wide\n- Columns expand to fill available space\n- There's a 1rem gap between items\n\nWould you like me to explain more about how this works?",
    },
    {
      id: 5,
      role: 'assistant',
      content:
        "Of course! I'd be happy to help with your coding question. What would you like to know?",
    },
    {
      id: 6,
      role: 'user',
      content: 'How do I create a responsive layout with CSS Grid?',
    },
    {
      id: 7,
      role: 'assistant',
      content:
        "Creating a responsive layout with CSS Grid is straightforward. Here's a basic example:\n\n```css\n.container {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n  gap: 1rem;\n}\n```\n\nThis creates a grid where:\n- Columns automatically fit as many as possible\n- Each column is at least 250px wide\n- Columns expand to fill available space\n- There's a 1rem gap between items\n\nWould you like me to explain more about how this works?",
    },
  ]);

  return (
    <ChatContainer className="relative group flex flex-col justify-center w-full max-w-3xl md:px-4 pb-2 gap-2 items-end">
      {messages.map(message => {
        const isAssistant = message.role === 'assistant';

        return (
          <Message
            key={message.id}
            className={cn(
              message.role === 'user'
                ? 'justify-end'
                : 'justify-enter max-w-none w-full',
              'py-2',
            )}
          >
            {isAssistant ? (
              <MessageContent className="px-0 md:px-2" markdown>
                {message.content}
              </MessageContent>
            ) : (
              <MessageContent className="bg-primary w-full text-primary-foreground">
                {message.content}
              </MessageContent>
            )}
          </Message>
        );
      })}
      <div style={{ paddingBottom: '80px', width: '100%' }} />
    </ChatContainer>
  );
}

function Input() {
  const isLoading = true;
  const [input, setInput] = useState('');

  const handleValueChange = (value: string) => {
    setInput(value);
  };

  const handleSubmit = () => {
    if (input.trim() === '') return;
    console.log('Submitted:', input);
    setInput('');
  };

  return (
    <PromptInput
      value={input}
      onValueChange={handleValueChange}
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
            variant="default"
            size="icon"
            className="h-6 w-6 rounded-sm"
            onClick={handleSubmit}
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

export default function Home() {
  return (
    <div className="flex w-full h-full" data-testid="global-drop">
      <div className="flex w-full h-full overflow-hidden @container/mainview">
        <main className="h-dvh flex-grow flex-shrink relative selection:bg-highlight w-0 @container isolate">
          <div className="relative flex flex-col items-center h-full @container/main">
            <div className="w-full h-full overflow-y-auto overflow-x-hidden scrollbar-gutter-stable flex flex-col items-center px-5">
              <header className="w-full">
                <div className="flex items-center justify-start w-full max-w-3xl mt-4">
                  <Logo height={40} width={40} className="rounded-full" />
                  <span className="text-2xl ml-2 font-bold gradient-america text-transparent bg-clip-text">
                    DOGEai
                  </span>
                </div>
              </header>
              <div className="relative w-full flex flex-col items-center pt-4 pb-4">
                <div className="w-full max-w-3xl flex flex-col">
                  <ChatWithCustomScroll />
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 mx-auto inset-x-0 max-w-(--breakpoint-md) z-40">
              <div className="relative z-40 flex flex-col items-center w-full">
                <div style={{ opacity: 1, transform: 'none' }} />
                <div className="relative w-full sm:px-5 px-2 pb-2 sm:pb-4">
                  <div className="bottom-0 w-full text-base flex flex-col gap-2 items-center justify-center relative z-10">
                    <Input />
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
