'use client';
import { useRateLimit } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import { generateId } from 'ai';
import { useRouter } from 'next/navigation';
import React from 'react';
import { toast } from 'sonner';

export function ForkConversation({ messages }: { messages: string }) {
  const { login, authenticated } = usePrivy();
  const router = useRouter();
  const { reachedLimitForTheDay } = useRateLimit();

  // Start a new chat with a new ID
  const startNewChat = () => {
    if (reachedLimitForTheDay) {
      toast.error('You have reached your daily message limit.');
      return;
    }

    if (!authenticated) {
      login();
      return;
    }

    const newId = generateId();
    router.push(
      `/chat/${newId}?forked=${encodeURIComponent(messages)}&newChat=true`,
    );
  };

  return <Button onClick={startNewChat}>Continue Conversation</Button>;
}
