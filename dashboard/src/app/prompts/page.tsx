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
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useSelectedOrg } from '@/components/org-selector';

const EDITOR_MESSAGES = {
  LOADING: 'Loading...',
  ERROR: 'Error loading prompt.',
  EMPTY:
    'No prompt loaded.\nSelect a prompt by clicking dropdown on the top-right corner.',
};

function AvailableVersion({
  promptId,
  commitId,
  setValue,
}: {
  promptId: string;
  commitId: string | null;
  setValue: ({ content, id }: { content: string; id: string }) => void;
}) {
  const trpc = useTRPC();
  const { selectedOrg } = useSelectedOrg();
  const {
    data: availableVersions,
    hasNextPage,
    isLoading,
    fetchNextPage,
  } = useInfiniteQuery(
    trpc.getControlPlanePromptVersions.infiniteQueryOptions(
      {
        key: promptId,
        orgId: selectedOrg?.id || '',
        limit: 5,
      },
      {
        enabled: Boolean(selectedOrg?.id),
        staleTime: 0,
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

  const [open, setOpen] = useState(false);

  const displaySelectedValue = commitId
    ? (() => {
        const v = availableVersions?.pages?.find(
          k => k.commitId === commitId,
        )?.commitId;
        if (!v) return 'Select Version...';
        return `${v.slice(0, 5)}...${v.slice(-5)}`;
      })()
    : 'Select Version...';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className=" justify-between"
        >
          {displaySelectedValue}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Search Version..." />
          <CommandList>
            <CommandEmpty>No Versions Found.</CommandEmpty>
            {!isLoading &&
              availableVersions?.pages &&
              availableVersions.pages.length > 0 && (
                <CommandGroup>
                  {availableVersions.pages.map(key => {
                    const displayValue = `${key.commitId.slice(0, 5)}...${key.commitId.slice(-5)}`;
                    return (
                      <CommandItem
                        key={key.commitId}
                        value={key.commitId}
                        onSelect={currentValue => {
                          const selectedValue =
                            availableVersions.pages.find(
                              k => k.commitId === currentValue,
                            ) || null;
                          if (selectedValue) {
                            setValue({
                              content: selectedValue.content,
                              id: selectedValue.commitId,
                            });
                          }
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            commitId === key.commitId
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

function AvailablePrompts({
  value,
  setValue,
}: {
  value: string | null;
  setValue: (value: string | null) => void;
}) {
  const trpc = useTRPC();
  const { selectedOrg } = useSelectedOrg();

  const { data: availablePrompts, isLoading } = useQuery(
    trpc.getControlPlanePromptKeys.queryOptions(
      {
        orgId: selectedOrg?.id || '',
      },
      {
        staleTime: 60 * 1000,
        enabled: !!selectedOrg?.id,
      },
    ),
  );

  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between"
        >
          {value
            ? availablePrompts?.find(k => k === value)
            : 'Select Prompt...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search Key..." />
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
  const [state, setState] = useState<
    'editor' | 'review' | 'back-to-editor' | 'revert'
  >('editor');
  const [hasErrors, setHasErrors] = useState(false);
  const editor = useRef<Parameters<OnMount>['0']>(null);
  const monaco = useMonaco();
  const trpc = useTRPC();
  const { selectedOrg } = useSelectedOrg();
  const [selectedPromptVersion, setSelectedPromptVersion] = useState<
    string | null
  >(null);

  const { mutateAsync: apiUpdatePrompt } = useMutation(
    trpc.updateControlPlanePromptByKey.mutationOptions(),
  );

  const { mutateAsync: apiRevertPrompt } = useMutation(
    trpc.revertControlPlanePromptVersion.mutationOptions(),
  );
  const { data, isLoading, isError } = useQuery(
    trpc.getControlPlanePromptByKey.queryOptions(
      {
        key: selectedPromptKey || '',
        orgId: selectedOrg?.id || '',
      },
      {
        staleTime: 0,
        enabled: Boolean(selectedPromptKey) && Boolean(selectedOrg?.id),
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
    if (state === 'back-to-editor') return edited || data.content;
    return data.content;
  })();

  const readyForReview = (() => {
    if (hasErrors) return false;
    if (edited == null) return false;
    if (edited !== data?.content) return true;
    if (isError) return false;
    return false;
  })();

  return (
    <>
      <Header
        right={
          <div className="flex gap-2">
            {selectedPromptKey && data?.commitId && (
              <AvailableVersion
                promptId={selectedPromptKey}
                commitId={selectedPromptVersion || data?.commitId || null}
                setValue={v => {
                  setSelectedPromptVersion(v.id);
                  if (v.id === data?.commitId) {
                    setState('editor');
                    setEdited(null);
                  } else {
                    setState('revert');
                    validateTemplateVariables(v.content);
                    setEdited(v.content);
                  }
                }}
              />
            )}
            <AvailablePrompts
              value={selectedPromptKey}
              setValue={v => {
                setState('editor');
                setSelectedPromptKey(v);
                setSelectedPromptVersion(null);
                setEdited(null);
              }}
            />
          </div>
        }
      />
      <div className="relative">
        {state === 'editor' && (
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

        {(state === 'review' || state === 'revert') && (
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

                if (!selectedOrg?.id) {
                  toast.error('No organization selected');
                  return;
                }

                if (!selectedPromptKey) {
                  toast.error('No prompt selected');
                  return;
                }

                if (state === 'revert') {
                  if (!selectedPromptVersion) {
                    toast.error('No version selected to revert');
                    return;
                  }

                  toast.promise(
                    apiRevertPrompt({
                      key: selectedPromptKey,
                      commitId: selectedPromptVersion,
                      orgId: selectedOrg.id,
                    }),
                    {
                      loading: 'Reverting prompt...',
                      success: data => {
                        setSelectedPromptKey(null);
                        setEdited(null);
                        setState('editor');
                        return data.status;
                      },
                      error: err => {
                        return err?.message || 'Error reverting prompt';
                      },
                    },
                  );
                  return;
                }

                toast.promise(
                  apiUpdatePrompt({
                    key: selectedPromptKey,
                    value: edited,
                    orgId: selectedOrg.id,
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
              {state === 'revert' ? 'Revert' : 'Save Changes'}
            </Button>
          </>
        )}
      </div>
    </>
  );
}
