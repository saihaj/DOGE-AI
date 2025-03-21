'use client';
import { Settings as SettingsIcon } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useCookie } from '@/hooks/use-cookie';
import { API_URL, CF_BACKEND_HEADER_NAME, CF_COOKIE_NAME } from '@/lib/const';

export function Settings() {
  const { setTheme } = useTheme();
  const cookie = useCookie(CF_COOKIE_NAME);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <SettingsIcon />
          <span className="sr-only">Settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                toast('Are you sure you want to restart the agent?', {
                  action: {
                    label: 'Continue',
                    onClick: () => {
                      const data = fetch(`/api/restart`, {
                        method: 'POST',
                        headers: {
                          [CF_BACKEND_HEADER_NAME]: cookie,
                        },
                      });
                      toast.promise(data, {
                        loading: 'Restarting agent...',
                        success: 'Agent restarted',
                        error: 'Failed to restart agent',
                      });
                    },
                  },
                });
              }}
            >
              Restart Agent
            </Button>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  System
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
