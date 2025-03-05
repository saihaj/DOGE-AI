'use client';
import { copyToClipboardWithMeta } from '@/components/copy-button';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { API_URL } from '@/lib/const';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

export type KBEntries = {
  id: string;
  title: string;
  content: string;
};

export const columns = ({ mutate }: { mutate: () => void }) =>
  [
    {
      accessorKey: 'title',
      header: 'Title',
    },
    {
      accessorKey: 'content',
      header: 'Content',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const entry = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => copyToClipboardWithMeta(entry.title)}
              >
                Copy Title
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => copyToClipboardWithMeta(entry.content)}
              >
                Copy Content
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    const data = fetch(`${API_URL}/api/manual-kb`, {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ id: entry.id }),
                    });

                    toast.promise(data, {
                      loading: 'Deleting entry...',
                      success: data => {
                        if (data.ok) {
                          mutate();
                          return 'Entry deleted successfully';
                        }
                        throw new Error('Failed to delete entry');
                      },
                      error: 'Failed to delete entry',
                    });
                  }}
                >
                  Delete Entry
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ] as ColumnDef<KBEntries>[];
