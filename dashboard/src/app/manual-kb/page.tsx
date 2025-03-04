'use client';
import { Header } from '@/components/header';
import { columns } from './columns';
import { DataTable } from './data-table';
import { Drawer } from 'vaul';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { set, z } from 'zod';
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
import { API_URL } from '@/lib/const';
import { toast } from 'sonner';
import { useState } from 'react';

const data = [
  {
    id: '1',
    title: 'How to create a new user',
    content:
      "To create a new user, you need to go to the Users page and click on the 'Create User' button. Fill in the required information and click on the 'Save' button to create the user. ",
  },
  {
    id: '2',
    title: 'How to reset a password',
    content:
      "To reset a password, you need to go to the Users page and click on the 'Reset Password' button next to the user you want to reset the password for. Enter the new password and click on the 'Save' button to reset the password.",
  },
];

const formSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
});

export function InsertEntry() {
  const [open, setOpen] = useState(false);
  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setOpen(false);

    const data = fetch(`${API_URL}/api/manual-kb`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });

    toast.promise(data, {
      loading: 'Creating entry...',
      success: data => {
        if (data.ok) {
          form.reset(
            {
              title: '',
              content: '',
            },
            {
              keepValues: false,
              keepTouched: false,
              keepErrors: false,
            },
          );

          return 'Entry created successfully';
        }
        throw new Error('Failed to create entry');
      },
      error: 'Failed to create entry',
    });
  }

  return (
    <Drawer.Root direction="right" open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <Button variant="outline" size="sm" className="mt-2">
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
                  onSubmit={form.handleSubmit(onSubmit)}
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
  return (
    <>
      <Header right={<InsertEntry />} />
      <main className="mb-10">
        <DataTable columns={columns} data={data} />
      </main>
    </>
  );
}
