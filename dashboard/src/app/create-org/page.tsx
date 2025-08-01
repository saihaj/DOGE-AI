'use client';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useTRPC } from '@/lib/trpc';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(4),
});

export default function CreateOrg() {
  const trpc = useTRPC();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    resetOptions: {
      keepValues: false,
      keepErrors: false,
      keepTouched: false,
    },
  });

  const { mutateAsync: createOrg } = useMutation(
    trpc.createOrganization.mutationOptions(),
  );

  async function onSubmit(values: z.infer<typeof formSchema>) {
    toast.promise(
      createOrg({
        name: values.name,
        slug: values.slug,
      }),
      {
        loading: 'Creating org...',
        success: data => {
          return `Created org ${data.name} (${data.slug})`;
        },
        error: err => {
          return err?.message || 'Error reverting prompt';
        },
      },
    );
  }

  return (
    <>
      <Header />

      <div className="max-w-xl mx-auto">
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="CityDeskNYC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="cdnyc" {...field} />
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
              Create Org
            </Button>
          </form>
        </Form>
      </div>
    </>
  );
}
