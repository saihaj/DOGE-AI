import React from 'react';
import { ChatContainer } from '@/components/ui/chat-container';
import { Message, MessageContent } from '@/components/ui/message';
import { cn } from '@/lib/utils';
import { UseChatHelpers } from '@ai-sdk/react';
import { Loader2 } from 'lucide-react';

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

export function ChatWithCustomScroll({
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
