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
import Editor, { DiffEditor, useMonaco, OnMount } from '@monaco-editor/react';
import {
  ArrowLeftIcon,
  Check,
  ChevronsUpDown,
  DiffIcon,
  SaveIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { checkVariablesParser } from './validator';
import { toast } from 'sonner';
import { useTRPC } from '@/lib/trpc';
import { useMutation, useQuery } from '@tanstack/react-query';

const EDITOR_MESSAGES = {
  LOADING: 'Loading...',
  ERROR: 'Error loading prompt.',
  EMPTY:
    'No prompt loaded.\nSelect a prompt by clicking dropdown on the top-right corner.',
};

function AvailablePrompts({
  value,
  setValue,
}: {
  value: string | null;
  setValue: (value: string | null) => void;
}) {
  const trpc = useTRPC();
  const { data: availablePrompts, isLoading } = useQuery(
    trpc.getPromptKeys.queryOptions(),
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
          {value
            ? availablePrompts?.find(k => k === value)
            : 'Select Prompt...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search Model..." />
          <CommandList>
            <CommandEmpty>No Prompts Found.</CommandEmpty>
            {!isLoading && availablePrompts && availablePrompts.length > 0 && (
              <CommandGroup>
                {availablePrompts.map(key => (
                  <CommandItem
                    key={key}
                    value={key}
                    onSelect={currentValue => {
                      const selectedValue =
                        availablePrompts.find(k => k === currentValue) || null;
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
  const [selectedPromptKey, setSelectedPromptKey] = useState<string | null>(
    null,
  );
  const [state, setState] = useState<'editor' | 'review' | 'back-to-editor'>(
    'editor',
  );
  const [hasErrors, setHasErrors] = useState(false);
  const editor = useRef<Parameters<OnMount>['0']>(null);
  const monaco = useMonaco();
  const trpc = useTRPC();

  const { mutateAsync: apiUpdatePrompt } = useMutation(
    trpc.updatePromptByKey.mutationOptions(),
  );

  const { data, isLoading, isError } = useQuery(
    trpc.getPromptByKey.queryOptions(
      {
        key: selectedPromptKey || '',
      },
      {
        staleTime: 0,
        enabled: !!selectedPromptKey,
        retry: false,
      },
    ),
  );

  // Validation function
  function validateTemplateVariables(text: string) {
    const editorRef = editor.current;
    if (!monaco || !editorRef) return;

    const result = checkVariablesParser.parse(text);
    const markers: Parameters<typeof monaco.editor.setModelMarkers>[2] = [];

    // Mark potential templates that aren't valid as warnings
    result.allPotential.forEach((potential: string) => {
      if (!result.valid.includes(potential)) {
        const startPos = text.indexOf(potential);
        const endPos = startPos + potential.length;
        const lines = text.substring(0, startPos).split('\n');
        const startLine = lines.length;
        const startColumn = lines[lines.length - 1].length + 1;
        const endLines = text.substring(0, endPos).split('\n');
        const endLine = endLines.length;
        const endColumn = endLines[endLines.length - 1].length + 1;

        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: `Invalid template variable: only ""{{variable}}"" is allowed.`,
          startLineNumber: startLine,
          startColumn: startColumn,
          endLineNumber: endLine,
          endColumn: endColumn,
        });
      }
    });

    if (markers.length > 0) {
      setHasErrors(true);
    } else {
      setHasErrors(false);
    }

    // Set markers in the editor
    monaco?.editor.setModelMarkers(
      editorRef.getModel()!,
      'templateValidator',
      markers,
    );
  }

  const value = (() => {
    if (isLoading) return EDITOR_MESSAGES.LOADING;
    if (isError) return EDITOR_MESSAGES.ERROR;
    if (!data) return EDITOR_MESSAGES.EMPTY;
    if (state === 'back-to-editor') return edited || data;
    return data;
  })();

  const readyForReview = (() => {
    if (hasErrors) return false;
    if (edited == null) return false;
    if (edited !== data) return true;
    if (isError) return false;
    return false;
  })();

  return (
    <>
      <Header
        right={
          <AvailablePrompts
            value={selectedPromptKey}
            setValue={v => {
              setState('editor');
              setSelectedPromptKey(v);
              setEdited(null);
            }}
          />
        }
      />
      <div className="relative">
        {state !== 'review' && (
          <>
            <Editor
              height="100vh"
              onMount={ed => {
                editor.current = ed;
                // Initial validation
                validateTemplateVariables(ed.getValue());
              }}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              defaultLanguage="markdown"
              value={value}
              onChange={v => {
                if (v) {
                  if (Object.values(EDITOR_MESSAGES).includes(v)) return;
                  validateTemplateVariables(v);
                  setEdited(v);
                }
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
                readOnly: !selectedPromptKey || isLoading || isError,
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
            {readyForReview && (
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
                  wordWrap: 'on',
                  automaticLayout: true,
                  readOnly: true,
                  fontSize: 18,
                  mouseWheelZoom: false,
                  selectOnLineNumbers: true,
                  contextmenu: true,
                  minimap: {
                    enabled: false,
                  },
                }}
              />
            )}

            <Button
              onClick={() => setState('back-to-editor')}
              className="absolute bottom-20 left-10"
            >
              <ArrowLeftIcon />
              Go Back
            </Button>
            <Button
              disabled={!readyForReview}
              onClick={async () => {
                if (!edited) {
                  toast.error('No changes to save');
                  return;
                }

                if (!selectedPromptKey) {
                  toast.error('No prompt selected');
                  return;
                }

                toast.promise(
                  apiUpdatePrompt({
                    key: selectedPromptKey,
                    value: edited,
                  }),
                  {
                    loading: 'Updating prompt...',
                    success: data => {
                      setSelectedPromptKey(null);
                      setEdited(null);
                      setState('editor');
                      return data.status;
                    },
                    error: err => {
                      return err?.message || 'Error updating prompt';
                    },
                  },
                );
              }}
              className="absolute bottom-20 right-10"
            >
              <SaveIcon />
              Save Changes
            </Button>
          </>
        )}
      </div>
    </>
  );
}
