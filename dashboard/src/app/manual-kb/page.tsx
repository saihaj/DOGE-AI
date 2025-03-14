'use client';
import { Header } from '@/components/header';
import { columns } from './columns';
import { DataTable } from './data-table';
import { Drawer } from 'vaul';
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

const formSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
});

function EntryUi({ mutate }: { mutate: () => void }) {
  const cfAuthorizationCookie = useCookie(CF_COOKIE_NAME);
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    switch (type) {
      case 'create': {
        closeDrawer();

        const data = fetch(`${API_URL}/api/manual-kb`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [CF_BACKEND_HEADER_NAME]: cfAuthorizationCookie,
          },
          body: JSON.stringify(values),
        });

        toast.promise(data, {
          loading: 'Creating entry...',
          success: data => {
            if (data.ok) {
              mutate();
              clearState();
              return 'Entry created successfully';
            }
            throw new Error('Failed to create entry');
          },
          error: 'Failed to create entry',
        });
        break;
      }
      case 'edit': {
        closeDrawer();
        if (!state) {
          toast.error('Invalid state');
          return;
        }

        const data = fetch(`${API_URL}/api/manual-kb`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            [CF_BACKEND_HEADER_NAME]: cfAuthorizationCookie,
          },
          body: JSON.stringify({
            id: state.id,
            ...values,
          }),
        });

        toast.promise(data, {
          loading: 'Creating entry...',
          success: data => {
            if (data.ok) {
              mutate();
              clearState();
              return 'Entry created successfully';
            }
            throw new Error('Failed to create entry');
          },
          error: 'Failed to create entry',
        });
        break;
      }
      default: {
        toast.error('Unsupported action');
      }
    }
  }

  return (
    <Drawer.Root direction="right" open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => openDrawer()}
        >
          <PlusIcon className="w-6 h-6" />
          Insert Entry
        </Button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-10" />
        <Drawer.Content
          className="right-2 rounded-2xl top-2 bottom-2 fixed bg-primary-foreground z-10 outline-none max-w-2xl flex overflow-y-auto"
          // The gap between the edge of the screen and the drawer is 8px in this case.
          style={
            {
              '--initial-transform': 'calc(100% + 8px)',
            } as React.CSSProperties
          }
        >
          <div className="bg-primary-foreground h-full w-full grow p-5 flex flex-col rounded-2xl">
            <div className="mx-auto">
              <Drawer.Title className="font-bold text-lg mb-2 text-primary">
                Create new entry
              </Drawer.Title>
              <Drawer.Description className="text-primary mb-2 overflow-y-scroll">
                Add new entry to the knowledge base.
              </Drawer.Description>
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
                    Save
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export default function ManualKB() {
  const cfAuthorizationCookie = useCookie(CF_COOKIE_NAME);

  const { data, error, isLoading, mutate } = useSWRInfinite(
    index => {
      if (!IS_LOCAL && !cfAuthorizationCookie) return null;

      return `${API_URL}/api/manual-kb?page=${index + 1}&limit=20`;
    },
    (url: string) =>
      fetch(url, {
        headers: {
          [CF_BACKEND_HEADER_NAME]: cfAuthorizationCookie,
        },
      }).then(res => res.json()),
  );

  return (
    <>
      <Header right={<EntryUi mutate={mutate} />} />
      <main className="mb-10">
        {isLoading && (
          <div className="mt-10 flex justify-center">
            <Loader2Icon className="animate-spin" />
          </div>
        )}
        {error && <p>Error: {error.message}</p>}
        {data && (
          <DataTable
            columns={columns({ mutate, cfAuthorizationCookie })}
            data={data?.flatMap(a => a)}
          />
        )}
      </main>
    </>
  );
}
