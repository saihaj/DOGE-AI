'use client';
import type React from 'react';
import { useState } from 'react';
import { PlusIcon, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn, shortenAddress } from '@/lib/utils';
import { useLogin, usePrivy, useUser } from '@privy-io/react-auth';
import { CopyButton } from '@/components/copy-button';
import { useMediaQuery } from '@uidotdev/usehooks';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

type SettingsTab = 'account';
interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function SidebarItem({ icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 w-full rounded-lg text-left transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

const sidebarOptions = [
  {
    id: 'account' as const,
    label: 'Account',
    icon: <User className="h-5 w-5" />,
  },
];

function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <div className="w-full sm:w-64 border-r shrink-0 bg-muted/10">
      <div className="py-2">
        <div className="px-3 py-2">
          {sidebarOptions.map(item => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AccountSettings() {
  const {
    login,
    ready,
    linkWallet,
    authenticated,
    user,
    logout,
    setWalletRecovery,
  } = usePrivy();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Button onClick={login}>Login</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Avatar className="h-16 w-16">
          <AvatarImage
            src={user?.twitter?.profilePictureUrl || ''}
            alt={user?.twitter?.name || ''}
          />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{user.twitter?.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            @{user.twitter?.username}
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Wallets</CardTitle>
          <CardDescription>
            Connect your wallets to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {user.linkedAccounts
              .filter(a => a.type === 'smart_wallet' || a.type === 'wallet')
              .map(account => (
                <div
                  key={account.address}
                  className="flex justify-center items-center gap-2"
                >
                  {shortenAddress(account.address)}
                  <CopyButton value={account.address} />
                </div>
              ))}
          </div>
          <Button variant="outline" className="w-full" onClick={linkWallet}>
            <PlusIcon className="text-black h-4 w-4" />
            Link Wallet
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Embedded Wallet</CardTitle>
          <CardDescription>
            We generate a wallet for you to use with DOGEai. You can use this
            wallet to send and receive DOGEai tokens. Configure recovery
            information to recover your wallet in case you lose access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {user.linkedAccounts
              .filter(a => a.type === 'wallet')
              .map(account => (
                <div
                  key={account.address}
                  className="flex justify-center items-center gap-2"
                >
                  {shortenAddress(account.address)}
                  <CopyButton value={account.address} />
                </div>
              ))}
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={setWalletRecovery}
          >
            Set Wallet Recovery
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const isMobile = useMediaQuery('only screen and (max-width : 768px)');

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-xl font-semibold">
                Settings
              </DrawerTitle>
            </div>
          </DrawerHeader>
          <div className="flex flex-col h-full overflow-hidden">
            {sidebarOptions.map(item => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onOpenChange(false);
                }}
              />
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] p-0 gap-0 ">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Settings
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row h-full overflow-hidden">
          <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'account' && <AccountSettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
