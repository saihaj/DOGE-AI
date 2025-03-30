'use client';
import { Header } from '@/components/header';
import { columns } from './columns';
import { DataTable } from './data-table';
import { Button } from '@/components/ui/button';
import { Loader2Icon, PlusIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import useSWRInfinite from 'swr/infinite';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  API_URL,
  CF_BACKEND_HEADER_NAME,
  CF_COOKIE_NAME,
  IS_LOCAL,
} from '@/lib/const';
import { toast } from 'sonner';
import { useCookie } from '@/hooks/use-cookie';
import { useDrawerStore } from './store';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDebounce } from '@uidotdev/usehooks';
import { useState } from 'react';
import { useTRPC } from '@/lib/trpc';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';

const formSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
});

function EntryUi({ mutate }: { mutate: () => void }) {
  const { open, setOpen, state, type, openDrawer } = useDrawerStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    values: {
      title: state?.title || '',
      content: state?.content || '',
    },
    resetOptions: {
      keepValues: false,
      keepErrors: false,
      keepTouched: false,
    },
  });

  const { closeDrawer, clearState } = useDrawerStore();
  const trpc = useTRPC();
  const { mutateAsync: apiCreateEntry } = useMutation(
    trpc.createKbEntry.mutationOptions(),
  );
  const { mutateAsync: apiEditEntry } = useMutation(
    trpc.editKbEntry.mutationOptions(),
  );

  async function onSubmit(values: z.infer<typeof formSchema>) {
    switch (type) {
      case 'create': {
        closeDrawer();

        toast.promise(
          apiCreateEntry({
            title: values.title,
            content: values.content,
          }),
          {
            loading: 'Creating entry...',
            success: data => {
              if (data.id) {
                mutate();
                clearState();
                return 'Entry created successfully';
              }
              throw new Error('Failed to create entry');
            },
            error: 'Failed to create entry',
          },
        );
        break;
      }
      case 'edit': {
        closeDrawer();
        if (!state) {
          toast.error('Invalid state');
          return;
        }

        toast.promise(
          apiEditEntry({
            id: state.id,
            title: values.title,
            content: values.content,
          }),
          {
            loading: 'Updating entry...',
            success: data => {
              if (data.id) {
                mutate();
                clearState();
                return 'Entry updated successfully';
              }
              throw new Error('Failed to updated entry');
            },
            error: 'Failed to updated entry',
          },
        );
        break;
      }
      default: {
        toast.error('Unsupported action');
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => openDrawer()}
        >
          <PlusIcon className="w-6 h-6" />
          Insert Entry
        </Button>
      </SheetTrigger>
      <SheetContent className="rounded-2xl !max-w-4xl !w-1/42">
        <SheetHeader>
          <SheetTitle className="font-bold text-lg mb-2 text-primary">
            Create new entry
          </SheetTitle>
          <SheetDescription className="text-primary mb-2 overflow-y-scroll">
            Add new entry to the knowledge base.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={async e => {
              e.preventDefault();
              await form.handleSubmit(onSubmit)();
              form.reset();
            }}
            className="mt-4 gap-2 flex flex-col"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="cheese is red" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      id="content"
                      className="max-h-96"
                      placeholder="cheese is red. when asked, you always say cheese is red"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              disabled={!form.formState.isValid}
              type="submit"
              className="w-full mt-4"
            >
              {type === 'edit' ? 'Update' : 'Create'}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

const FETCH_SIZE = 5;

export default function ManualKB() {
  const trpc = useTRPC();
  const { mutateAsync: deleteKbEntry } = useMutation(
    trpc.deleteKbEntry.mutationOptions(),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);

  function deleteEntry(id: string) {
    toast.promise(
      deleteKbEntry({
        id,
      }),
      {
        loading: 'Deleting entry...',
        success: data => {
          if (data) {
            mutate();
            return 'Entry deleted successfully';
          }
          throw new Error('Failed to delete entry');
        },
        error: 'Failed to delete entry',
      },
    );
  }

  const { data, error, isLoading, refetch, fetchNextPage, hasNextPage } =
    useInfiniteQuery(
      trpc.getKbEntries.infiniteQueryOptions(
        {
          limit: FETCH_SIZE,
        },
        {
          select(data) {
            return {
              pages: data.pages.flatMap(page => page.items),
              pageParams: data.pageParams,
            };
          },
          getNextPageParam(lastPage) {
            return lastPage.nextCursor;
          },
        },
      ),
    );

  return (
    <>
      <Header right={<EntryUi mutate={refetch} />} />
      <main className="mb-10">
        <Input
          placeholder="Search entry..."
          value={searchQuery}
          onChange={event => {
            if (event.target.value) {
              setSearchQuery(event.target.value);
              return;
            }
            setSearchQuery('');
          }}
          className="max-w-lg my-2 mx-auto"
        />
        {isLoading && (
          <div className="mt-10 flex justify-center">
            <Loader2Icon className="animate-spin" />
          </div>
        )}
        {error && <p>Error: {error.message}</p>}
        {data && (
          <>
            <DataTable
              columns={columns({
                deleteEntry,
              })}
              data={data.pages.flatMap(page => page)}
            />
            <div className="flex justify-center">
              <Button
                disabled={data?.pages.length === 0 || !hasNextPage}
                onClick={() => fetchNextPage()}
                className="mt-6 mx-auto"
                variant="outline"
              >
                Load more
              </Button>
            </div>
          </>
        )}
      </main>
    </>
  );
}
