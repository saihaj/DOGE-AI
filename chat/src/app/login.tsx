import { User2Icon, UserIcon, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shortenAddress } from '@/lib/utils';
import { usePrivy } from '@privy-io/react-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { useMediaQuery } from '@uidotdev/usehooks';
import { SettingsDialog, SettingsDrawer } from './profile';

export function LoginButton() {
  const { login, ready, user, logout } = usePrivy();
  const [showProfile, setShowProfile] = useState(false);
  const isMobile = useMediaQuery('only screen and (max-width : 768px)');

  if (!ready) return null;

  if (user) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="rounded-full h-10 w-10 text-black"
            >
              <Avatar>
                <AvatarImage
                  src={user?.twitter?.profilePictureUrl || ''}
                  alt={`${user?.twitter?.name || ''} profile picture`}
                />
                <AvatarFallback>
                  {user.twitter?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>
              {user.twitter?.name || shortenAddress(user.wallet?.address || '')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setShowProfile(true)}>
                <UserIcon className="text-black" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <LogOut className="text-black" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {isMobile ? (
          <SettingsDrawer open={showProfile} onOpenChange={setShowProfile} />
        ) : (
          <SettingsDialog open={showProfile} onOpenChange={setShowProfile} />
        )}
      </>
    );
  }

  return (
    <Button onClick={login}>
      <User2Icon />
      <span>Login</span>
    </Button>
  );
}
