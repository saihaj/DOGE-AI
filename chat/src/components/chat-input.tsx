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

export function ChatInput({
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
            disabled={input.length === 0 && !isLoading}
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
  );
}
