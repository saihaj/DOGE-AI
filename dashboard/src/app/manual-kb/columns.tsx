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
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { drawerStore, KBEntries } from './store';

export const columns = ({
  deleteEntry,
}: {
  deleteEntry: (id: string) => void;
}) =>
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
                  variant="secondary"
                  className="w-full"
                  onClick={() => drawerStore.getState().openDrawer(entry)}
                >
                  Edit Entry
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    deleteEntry(entry.id);
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
