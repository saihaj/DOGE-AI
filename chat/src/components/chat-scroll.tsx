import React from 'react';
import { ChatContainer } from '@/components/ui/chat-container';
import { Message, MessageContent } from '@/components/ui/message';
import { cn } from '@/lib/utils';
import { UseChatHelpers } from '@ai-sdk/react';
import { Loader2 } from 'lucide-react';
import { Tweet } from 'react-tweet';

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

const IS_TWITTER_URL =
  /(https?:\/\/)?((www\.)?(twitter|x)\.com\/(?:(?:i\/web\/status\/|status\/)?\d+|[^/\s]+)(\/[^/\s]*)?)/i;

const EXTRACT_TWEET_ID = /(?:i\/web\/status\/|status\/)(\d{15,19})/i;

function renderUserMessage(message: UseChatHelpers['messages'][0]) {
  const text =
    message?.parts
      ?.map(part => {
        if (part.type === 'text') {
          return part.text;
        }
        return '';
      })
      .join('') ||
    message.content ||
    '';

  const hasTweet = IS_TWITTER_URL.test(text);
  const tweetId = hasTweet ? text.match(EXTRACT_TWEET_ID)?.[1] : null;

  return (
    // @ts-ignore
    <MessageContent className="bg-primary w-full text-primary-foreground whitespace-normal">
      <>
        {tweetId && (
          <div className="-mb-4">
            <Tweet id={tweetId} />
          </div>
        )}
        {text}
      </>
    </MessageContent>
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
              message.role === 'user' ? 'justify-end' : 'justify-start',
              'py-2 max-w-none w-full md:w-fit',
            )}
          >
            {isAssistant
              ? renderMessageParts(message)
              : renderUserMessage(message)}
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
      <div style={{ paddingBottom: '100px', width: '100%' }} />
    </ChatContainer>
  );
}
