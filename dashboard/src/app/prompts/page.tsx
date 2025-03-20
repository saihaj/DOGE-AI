'use client';
import { Header } from '@/components/header';
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
import Editor, { DiffEditor } from '@monaco-editor/react';
import {
  ArrowLeftIcon,
  Check,
  ChevronsUpDown,
  DiffIcon,
  SaveIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import useSWR from 'swr';
import { useState } from 'react';
import { API_URL, CF_BACKEND_HEADER_NAME, CF_COOKIE_NAME } from '@/lib/const';
import { useCookie } from '@/hooks/use-cookie';
import { cn } from '@/lib/utils';

function AvailablePrompts({
  value,
  setValue,
}: {
  value: string | null;
  setValue: (value: string | null) => void;
}) {
  const cfAuthorizationCookie = useCookie(CF_COOKIE_NAME);
  const { data, isLoading } = useSWR<{
    keys: string[];
  }>(`${API_URL}/api/prompts`, (url: string) =>
    fetch(url, {
      headers: {
        [CF_BACKEND_HEADER_NAME]: cfAuthorizationCookie,
      },
    }).then(res => res.json()),
  );
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[400px] justify-between"
        >
          {value ? data?.keys?.find(k => k === value) : 'Select Prompt...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search Model..." />
          <CommandList>
            <CommandEmpty>No Prompts Found.</CommandEmpty>
            {!isLoading && data?.keys && data.keys.length > 0 && (
              <CommandGroup>
                {data?.keys.map(key => (
                  <CommandItem
                    key={key}
                    value={key}
                    onSelect={currentValue => {
                      const selectedValue =
                        data.keys.find(k => k === currentValue) || null;
                      if (selectedValue) {
                        setValue(selectedValue);
                      }
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === key ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {key}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function Prompts() {
  const { theme } = useTheme();
  const [edited, setEdited] = useState<string | null>(null);
  const cfAuthorizationCookie = useCookie(CF_COOKIE_NAME);
  const [selectedPromptKey, setSelectedPromptKey] = useState<string | null>(
    null,
  );
  const [state, setState] = useState<'editor' | 'review'>('editor');
  const { data, isLoading, error } = useSWR<{
    value: string;
  }>(
    selectedPromptKey ? `${API_URL}/api/prompt/${selectedPromptKey}` : null,
    async (url: string) => {
      const res = await fetch(url, {
        headers: {
          [CF_BACKEND_HEADER_NAME]: cfAuthorizationCookie,
        },
      });

      if (!res.ok) {
        const message = await res.text();
        const error = new Error(message);
        throw error;
      }

      return res.json();
    },
  );

  const value = (() => {
    if (isLoading) return 'Loading...';
    if (error) return 'Error loading prompt.';
    return (
      data?.value ||
      'No prompt loaded.\nSelect a prompt by clicking dropdown on the top-right corner.'
    );
  })();

  return (
    <>
      <Header
        right={
          <AvailablePrompts
            value={selectedPromptKey}
            setValue={v => {
              setSelectedPromptKey(v);
              setEdited(null);
            }}
          />
        }
      />
      <div className="relative">
        {state === 'editor' && (
          <>
            <Editor
              height="100vh"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              defaultLanguage="markdown"
              value={value}
              onChange={v => {
                if (v) setEdited(v);
              }}
              options={{
                automaticLayout: true,
                wordWrap: 'on',
                inDiffEditor: false,
                smartSelect: {
                  selectSubwords: true,
                  selectLeadingAndTrailingWhitespace: true,
                },
                fontSize: 18,
                readOnly: !selectedPromptKey || isLoading || error,
                mouseWheelZoom: false,
                selectOnLineNumbers: true,
                cursorBlinking: 'blink',
                cursorStyle: 'line',
                contextmenu: true,
                minimap: {
                  enabled: false,
                },
              }}
            />
            {edited != null && (
              <Button
                onClick={() => setState('review')}
                className="absolute bottom-20 right-10"
              >
                <DiffIcon />
                Review Changes
              </Button>
            )}
          </>
        )}

        {state === 'review' && (
          <>
            {edited != null && (
              <DiffEditor
                height="100vh"
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                language="markdown"
                original={value}
                modified={edited}
                options={{
                  readOnly: true,
                }}
              />
            )}

            <Button
              onClick={() => setState('editor')}
              className="absolute bottom-20 left-10"
            >
              <ArrowLeftIcon />
              Go Back
            </Button>
            <Button onClick={() => {}} className="absolute bottom-20 right-10">
              <SaveIcon />
              Save Changes
            </Button>
          </>
        )}
      </div>
    </>
  );
}
