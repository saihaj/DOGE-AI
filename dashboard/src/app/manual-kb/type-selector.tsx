'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const values = [
  {
    value: 'agent',
    label: 'Agent',
  },
  {
    value: 'chat',
    label: 'Chat',
  },
  {
    value: 'custom1',
    label: 'CT 1',
  },
  {
    value: 'custom2',
    label: 'CT 2',
  },
] as const;

type Values = (typeof values)[number]['value'];

export function TypeSelector({
  value,
  setValue,
}: {
  value: Values;
  setValue: React.Dispatch<React.SetStateAction<Values>>;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[100px] justify-between"
        >
          {value
            ? values.find(v => v.value === value)?.label
            : 'Select Type...'}
          <ChevronsUpDown className="h-2 w-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[100px] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No framework found.</CommandEmpty>
            <CommandGroup>
              {values.map(v => (
                <CommandItem
                  key={v.value}
                  value={v.value}
                  onSelect={currentValue => {
                    const selectedValue =
                      values.find(v => v.value === currentValue)?.value || null;
                    if (selectedValue) {
                      setValue(selectedValue);
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'h-2 w-2',
                      value === v.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {v.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
