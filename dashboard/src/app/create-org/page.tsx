'use client';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { useTRPC } from '@/lib/trpc';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function CreateOrg() {
  const trpc = useTRPC();

  const { mutateAsync: createOrg } = useMutation(
    trpc.createOrganization.mutationOptions(),
  );

  return (
    <>
      <Header />

      <Button
        onClick={() => {
          toast.promise(
            createOrg({
              name: 'CityDeskNYC',
              slug: 'cdnyc',
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
        }}
      >
        create org
      </Button>
    </>
  );
}
