'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { UseChatHelpers } from '@ai-sdk/react';
import 'ios-vibrator-pro-max';
import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function ChatInput({
  input,
  setInput,
  isLoading,
  handleSubmit,
  stop,
  rateLimited,
}: {
  input: UseChatHelpers['input'];
  isLoading: boolean;
  handleSubmit: UseChatHelpers['handleSubmit'];
  setInput: UseChatHelpers['setInput'];
  stop: UseChatHelpers['stop'];
  rateLimited?: boolean;
}) {
  return (
    <div className="w-full relative">
      <AnimatePresence>
        {rateLimited && (
          <motion.div
            className="w-full absolute top-0 -z-10 rounded-t-sm bg-red-600 p-1 text-center text-xs text-white"
            initial={{ transform: 'translateY(100%)' }}
            animate={{ transform: 'translateY(-100%)' }}
            exit={{ transform: 'translateY(100%)' }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ zIndex: -1 }}
          >
            You have reached your daily message limit.
          </motion.div>
        )}
      </AnimatePresence>
      <PromptInput
        value={input}
        onValueChange={setInput}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        className={cn(
          'w-full ',
          rateLimited ? 'rounded-b-sm rounded-t-none' : 'rounded-sm',
        )}
      >
        <PromptInputTextarea placeholder="Ask me anything..." />
        <PromptInputActions className="justify-end pt-2">
          <PromptInputAction
            tooltip={isLoading ? 'Stop generation' : 'Send message'}
          >
            <Button
              disabled={(input.length === 0 && !isLoading) || rateLimited}
              variant="default"
              size="icon"
              className="h-6 w-6 rounded-sm"
              onClick={() => {
                if ('vibrate' in navigator) {
                  navigator.vibrate(50);
                }
                isLoading ? stop() : handleSubmit();
              }}
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
    </div>
  );
}
