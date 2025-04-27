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
      content: 'break down the Save act for me?',
    },
    {
      id: 2,
      role: 'assistant',
      content: `The SAVE Act (Safeguard American Voter Eligibility Act) is a bill introduced in the U.S. House of Representatives that aims to amend the National Voter Registration Act of 1993. Its primary goal is to require proof of United States citizenship for individuals registering to vote in federal elections. Here’s a breakdown of its key provisions:

1. Proof of Citizenship Requirement
- The Act mandates that anyone registering to vote in federal elections must provide documentary proof of U.S. citizenship.
- Acceptable documents include:
  - REAL ID-compliant identification showing citizenship
  - Valid U.S. passport
  - U.S. military ID with a record of U.S. birth
  - Government-issued photo ID showing U.S. place of birth
  - Government-issued photo ID plus a certified birth certificate, hospital record of birth, adoption decree, Consular Report of Birth Abroad, Naturalization Certificate, or American Indian Card (KIC classification)

2. Application Process Changes
- States cannot process voter registration applications for federal elections without documentary proof of citizenship.
- Applies to all registration methods: in-person, by mail, and through motor vehicle departments (DMVs).
- States must verify citizenship status during the registration process.

3. Special Provisions for Those Without Documents
- States must establish a process for applicants who cannot provide standard documents but can submit other evidence and sign an attestation under penalty of perjury.
- Election officials must make a determination and sign an affidavit if citizenship is established by alternative means.

4. Ongoing Verification and Removal
- States must actively ensure only citizens are registered, using data from the Department of Homeland Security, Social Security Administration, state agencies, and other sources.
- Noncitizens must be removed from voter rolls if documentation or verified information shows they are not U.S. citizens.

5. Federal Agency Cooperation
- Federal agencies must provide relevant citizenship information to state election officials within 24 hours of request, free of charge.

6. Penalties and Enforcement
- Criminal penalties for election officials who register applicants without proof of citizenship.
- Private right of action: individuals can sue for violations, including improper registration of noncitizens.

7. Provisional Ballots
- The Act does not prevent individuals from casting provisional ballots; these can be counted if citizenship is verified.

8. Implementation and Guidance
- The Election Assistance Commission must issue guidance to states within 10 days of enactment.
- The Act takes effect immediately upon enactment and applies to all new voter registration applications from that date forward.

9. Exemptions and State Flexibility
- States previously exempt from the National Voter Registration Act must comply with the new citizenship requirements unless they adopt identical requirements within 60 days of the first federal election after enactment.

Summary
The SAVE Act is designed to ensure that only U.S. citizens can register to vote in federal elections by requiring documentary proof of citizenship at registration. It establishes strict verification processes, mandates cooperation between federal and state agencies, and imposes penalties for noncompliance.

If you need a summary of the fiscal or administrative impact, or a comparison to current law, let me know!`,
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
