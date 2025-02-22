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
    value: 'o3-mini',
    label: 'OpenAI o3 mini',
  },
  {
    value: 'gpt-4o',
    label: 'OpenAI GPT 4o',
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
