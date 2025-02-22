'use client';
import type React from 'react';

import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';

export default function ChatInterface() {
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful AI assistant.',
  );
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const { messages, input, handleInputChange, handleSubmit, setMessages } =
    useChat({
      initialMessages: [
        {
          id: 'system',
          role: 'system',
          content: systemPrompt,
        },
      ],
    });

  const handleSystemPromptChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setSystemPrompt(e.target.value);
    // Reset chat with new system prompt
    setMessages([
      {
        id: 'system',
        role: 'system',
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
    <div className="flex flex-col w-full h-dvh overflow-hidden">
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <SidebarTrigger />
          <h1 className="text-xl font-semibold">DOGEai</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClearChat}>
              Clear
            </Button>
          </div>
        </div>

        {/* Expandable System Prompt Area */}
        <Accordion type="single" collapsible className="w-full sticky">
          <AccordionItem value="system-prompt" className="border-b-0">
            <AccordionTrigger className="px-4 py-2 bg-gray-900 hover:bg-gray-800 hover:no-underline">
              <span className="text-sm font-medium text-gray-400">
                System message
              </span>
            </AccordionTrigger>
            <AccordionContent className="bg-gray-900 px-4 py-4">
              <Textarea
                value={systemPrompt}
                onChange={handleSystemPromptChange}
                placeholder="Enter system message..."
                className="min-h-[100px] bg-gray-800 border-gray-700 text-white resize-y max-h-[50vh]"
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Scrollable Messages Area */}
        <ScrollArea className="flex-1 w-full md:max-w-4xl mx-auto max-h-[calc(100vh-10rem)]">
          <div className="flex flex-col gap-4 p-4" ref={messagesContainerRef}>
            {messages
              .filter(message => message.role !== 'system')
              .map(message => (
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
                      'max-w-[70%] mx-2 text-wrap', // Added margin
                      'px-3 py-2 rounded-md shadow-sm', // Added shadow
                      message.role === 'user'
                        ? 'bg-gray-800 text-gray-300 rounded-br-none' // Different corner for user
                        : 'bg-gray-900 text-gray-300 rounded-bl-none', // Different corner for assistant
                    )}
                  >
                    <div>{message.content}</div>
                  </div>
                </div>
              ))}
            <div
              ref={messagesEndRef}
              className="shrink-0 min-w-[24px] min-h-[24px]"
            />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-800 sticky bottom-0 z-10 bg-background">
          <div className="w-full md:max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Enter user message..."
                className="flex-1 bg-gray-800 border-gray-700 text-white"
              />
              <Button type="submit">Send</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
