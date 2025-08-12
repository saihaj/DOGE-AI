'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const models = [
  {
    value: 'sonar-reasoning-pro',
    label: 'Sonar Reasoning Pro',
  },
  {
    value: 'sonar-reasoning',
    label: 'Sonar Reasoning',
  },
  {
    value: 'deepseek-r1',
    label: 'DeepSeek R1',
  },
  {
    value: 'deepseek-r1-0528',
    label: 'R1 0528',
  },
  {
    value: 'gpt-4o',
    label: 'GPT 4o',
  },
  {
    value: 'gpt-4o-mini',
    label: 'GPT 4o Mini',
  },
  {
    value: 'gpt-4.1',
    label: 'GPT 4.1',
  },
  {
    value: 'gpt-4.1-mini',
    label: 'GPT 4.1 Mini',
  },
  {
    value: 'gpt-4.1-nano',
    label: 'GPT 4.1 Nano',
  },
  {
    value: 'gpt-5',
    label: 'GPT 5',
  },
  {
    value: 'gpt-5-mini',
    label: 'GPT 5 Mini',
  },
  {
    value: 'gpt-5-nano',
    label: 'GPT 5 Nano',
  },
  {
    value: 'gpt-5-chat-latest',
    label: 'GPT 5 Chat',
  },
  {
    value: 'chatgpt-4o-latest',
    label: '4o Chat',
  },
  {
    value: 'gpt-oss-120b',
    label: 'GPT OSS (120B)',
  },
  {
    value: 'gpt-oss-20b',
    label: 'GPT OSS (20B)',
  },
  {
    value: 'o3-mini',
    label: 'o3 Mini',
  },
  {
    value: 'o4-mini',
    label: 'o4 Mini',
  },
  {
    value: 'grok-3',
    label: 'Grok 3',
  },
  {
    value: 'grok-3-mini',
    label: 'Grok 3 Mini',
  },
  {
    value: 'claude-3-5-sonnet-latest',
    label: 'Sonnet 3.5',
  },
  {
    value: 'claude-3-5-haiku-latest',
    label: 'Haiku 3.5',
  },
  {
    value: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
  },
  {
    value: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
  },
  {
    value: 'gemini-2.0-flash-exp',
    label: 'Gemini 2.0 Flash',
  },
  {
    value: 'gemini-2.0-flash-thinking',
    label: 'Gemini 2.0 Flash Thinking',
  },
  {
    value: 'gemini-2.5-pro-exp',
    label: 'Gemini 2.5 Pro Exp',
  },
  {
    value: 'moonshotai/kimi-k2',
    label: 'Kimi K2',
  },
] as const;

export type ModelValues = (typeof models)[number]['value'];

export function ModelSelector({
  value,
  setValue,
}: {
  value: ModelValues;
  setValue: React.Dispatch<React.SetStateAction<ModelValues>>;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          size="sm"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value
            ? models.find(model => model.value === value)?.label
            : 'Select Model...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search Model..." />
          <CommandList>
            <CommandEmpty>No framework found.</CommandEmpty>
            <CommandGroup>
              {models.map(model => (
                <CommandItem
                  key={model.value}
                  value={model.value}
                  onSelect={currentValue => {
                    const selectedValue =
                      models.find(model => model.value === currentValue)
                        ?.value || null;
                    if (selectedValue) {
                      setValue(selectedValue);
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === model.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {model.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
