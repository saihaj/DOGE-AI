'use client';
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
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalStorageState } from 'ahooks';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';

export function useSelectedOrg() {
  const [selectedOrg, setSelectedOrg] = useLocalStorageState<
    ReturnType<typeof useTRPC>['getOrgs']['~types']['output']['items'][number]
  >('playgroundSelectedOrg', undefined);

  return {
    selectedOrg,
    setSelectedOrg,
  };
}

export function AvailableOrgs() {
  const trpc = useTRPC();
  const { selectedOrg, setSelectedOrg } = useSelectedOrg();

  const {
    data: availableOrgs,
    hasNextPage,
    isLoading,
    fetchNextPage,
  } = useInfiniteQuery(
    trpc.getOrgs.infiniteQueryOptions(
      {
        limit: 5,
      },
      {
        staleTime: 10 * 1000,
        select(data) {
          return {
            pages: data.pages.flatMap(page => page.items),
            pageParams: data.pageParams,
          };
        },
        getNextPageParam: lastPage => lastPage.nextCursor,
      },
    ),
  );

  const displayValue = selectedOrg ? selectedOrg.name : 'Select Org';

  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between w-full"
        >
          {displayValue}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No Org Found.</CommandEmpty>
            {!isLoading &&
              availableOrgs?.pages &&
              availableOrgs.pages.length > 0 && (
                <CommandGroup>
                  {availableOrgs.pages.map(key => {
                    const displayValue = `${key.name} (${key.slug})`;
                    return (
                      <CommandItem
                        key={key.id}
                        value={key.slug}
                        onSelect={() => {
                          setSelectedOrg(key);
                          setOpen(false);
                          // TODO: can improve this to not reload the page and instead use react-query to refetch
                          globalThis.window.location.reload();
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedOrg?.id === key.id
                              ? 'opacity-100'
                              : 'opacity-0',
                          )}
                        />
                        {displayValue}
                      </CommandItem>
                    );
                  })}
                  {hasNextPage && (
                    <CommandItem asChild>
                      <Button
                        size="sm"
                        className="w-full justify-center"
                        variant="ghost"
                        onClick={() => fetchNextPage()}
                      >
                        Load More
                      </Button>
                    </CommandItem>
                  )}
                </CommandGroup>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
