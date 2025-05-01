'use client';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { Square, ArrowUp, Loader2, Trash2, Trash } from 'lucide-react';
import { Message, MessageContent } from '@/components/ui/message';
import { Button } from '@/components/ui/button';
import { ChatContainer } from '@/components/ui/chat-container';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { CF_BACKEND_HEADER_NAME, CF_COOKIE_NAME } from '@/lib/const';
import { useChat, UseChatHelpers } from '@ai-sdk/react';
import { useCookie } from '@/components/hooks/use-cookie';
import { toast } from 'sonner';
import { Markdown } from '@/components/ui/markdown';

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

function ChatWithCustomScroll({
  messages,
  status,
}: {
  messages: UseChatHelpers['messages'];
  status: UseChatHelpers['status'];
}) {
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
                : 'justify-start max-w-none w-full',
              'py-2',
            )}
          >
            {isAssistant ? (
              renderMessageParts(message)
            ) : (
              <MessageContent className="bg-primary w-full text-primary-foreground">
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
            variant="default"
            size="icon"
            className="h-6 w-6 rounded-sm"
            onClick={isLoading ? stop : handleSubmit}
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
  const cfAuthorizationCookie = useCookie(CF_COOKIE_NAME);
  const {
    messages,
    input,
    setInput,
    stop,
    handleSubmit,
    reload,
    status,
    setMessages,
  } = useChat({
    api: `/api/chat`,
    body: {
      selectedChatModel: 'gpt-4.1',
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
  });

  return (
    <div className="flex w-full h-full" data-testid="global-drop">
      <div className="flex w-full h-full overflow-hidden @container/mainview">
        <main className="h-dvh flex-grow flex-shrink relative selection:bg-highlight w-0 @container isolate">
          <div className="relative flex flex-col items-center h-full @container/main">
            <div className="w-full h-full overflow-y-auto overflow-x-hidden scrollbar-gutter-stable flex flex-col items-center px-5">
              <header className="w-full sticky top-0 z-50 bg-background mask-b-from-90% backdrop-blur-md pb-2">
                <div className="flex items-center justify-between w-full mt-2">
                  <div className="flex items-center">
                    <Logo height={40} width={40} className="rounded-full" />
                    <span className="text-2xl ml-2 font-bold gradient-america text-transparent bg-clip-text">
                      DOGEai
                    </span>
                  </div>
                  <Button
                    disabled={messages.length === 0}
                    onClick={() => {
                      stop();
                      setMessages([]);
                    }}
                    variant="outline"
                  >
                    <Trash />
                  </Button>
                </div>
              </header>
              <div className="relative w-full flex flex-col items-center pt-4 pb-4">
                <div className="w-full max-w-3xl flex flex-col">
                  <ChatWithCustomScroll status={status} messages={messages} />
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 mx-auto inset-x-0 max-w-(--breakpoint-md) z-40">
              <div className="relative z-40 flex flex-col items-center w-full">
                <div style={{ opacity: 1, transform: 'none' }} />
                <div className="relative w-full sm:px-5 px-2 pb-2 sm:pb-4">
                  <div className="bottom-0 mb-[env(safe-area-inset-bottom)] w-full text-base flex flex-col gap-2 items-center justify-center relative z-10">
                    <Input
                      input={input}
                      isLoading={
                        status === 'streaming' || status === 'submitted'
                      }
                      handleSubmit={handleSubmit}
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
