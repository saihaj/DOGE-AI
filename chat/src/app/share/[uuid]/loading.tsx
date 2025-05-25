import React from 'react';
import { Logo } from '@/components/logo';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatContainer } from '@/components/ui/chat-container';
import { Message } from '@/components/ui/message';
import { cn } from '@/lib/utils';

export default function Loading() {
  // Create an array of mock messages for the loading state
  const mockMessages = Array.from({ length: 4 }, (_, i) => ({
    id: i,
    isUser: i % 2 === 0,
  }));

  return (
    <div className="flex w-full h-full">
      <div className="flex w-full h-full overflow-hidden @container/mainview">
        <main className="h-dvh flex-grow flex-shrink relative selection:bg-highlight w-0 @container isolate">
          <div className="relative flex flex-col items-center h-full @container/main">
            <div className="w-full overflow-y-auto overflow-x-hidden scrollbar-gutter-stable flex flex-col items-center px-5">
              <header className="w-full sticky top-0 z-50 bg-background mask-b-from-90% backdrop-blur-md pb-2">
                <div className="flex items-center justify-between w-full mt-2">
                  <div className="flex items-center">
                    <Logo height={40} width={40} className="rounded-full" />
                    <span className="text-2xl ml-2 font-bold gradient-america text-transparent bg-clip-text">
                      DOGEai
                    </span>
                  </div>
                </div>
              </header>

              <div className="relative w-full flex flex-col items-center pt-4 pb-4">
                <div className="w-full max-w-3xl flex flex-col">
                  <ChatContainer
                    autoScroll={false}
                    className="relative group flex flex-col justify-center w-full max-w-3xl md:px-4 pb-2 gap-2 items-end"
                  >
                    {mockMessages.map(message => (
                      <Message
                        key={message.id}
                        className={cn(
                          message.isUser
                            ? 'justify-end'
                            : 'justify-start max-w-none w-full',
                          'py-2',
                        )}
                      >
                        <Skeleton
                          className={cn(
                            'h-24',
                            message.isUser
                              ? 'w-80 ml-auto'
                              : 'w-full max-w-3xl',
                          )}
                        />
                      </Message>
                    ))}
                  </ChatContainer>
                </div>
              </div>

              <footer className="w-full max-w-3xl mt-auto py-4 text-center border-t">
                <Skeleton className="h-5 w-96 mx-auto" />
              </footer>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
