'use client';
import type React from 'react';
import { useState, useEffect } from 'react';
import { ChevronRight, PlusIcon, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn, shortenAddress } from '@/lib/utils';
import { usePrivy } from '@privy-io/react-auth';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/copy-button';

type SettingsTab = 'account';

function SidebarItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
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

function SettingsSidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}) {
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

function AccountSettings() {
  const { login, ready, linkWallet, authenticated, user, setWalletRecovery } =
    usePrivy();

  if (!user || !ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <Button onClick={login}>Login</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center gap-4">
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

function SettingsMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50">
          {icon}
        </div>
        <span className="text-base font-medium">{label}</span>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );
}

export function SettingsDrawer({
  onOpenChange,
  open,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [active, setActive] = useState<SettingsTab | 'main'>('main');

  // Reset to main section when drawer closes
  useEffect(() => {
    if (!open) {
      setActive('main');
    }
  }, [open]);

  const navigateTo = (newSection: typeof active) => {
    setActive(newSection);
  };

  const navigateBack = () => setActive('main');

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-xl">
        <div className="w-full mx-auto max-w-lg">
          <DrawerHeader className="border-b">
            <DrawerTitle className="text-lg font-semibold">
              <div className="flex items-center justify-between">
                {active !== 'main' ? (
                  <Button
                    variant="ghost"
                    onClick={navigateBack}
                    className="-ml-4 -my-2"
                    aria-label="Back to main menu"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </Button>
                ) : (
                  <div className="w-4" />
                )}
                {active === 'main' ? 'Settings' : 'Account'}
                <div className="w-4" />
              </div>
            </DrawerTitle>
          </DrawerHeader>

          <div
            className="overflow-y-auto "
            style={{ height: 'calc(85vh - 120px)' }}
          >
            <div className="pb-8 pt-2 px-3">
              {active === 'main' ? (
                <div className="space-y-4">
                  {sidebarOptions.map(option => (
                    <SettingsMenuItem
                      key={option.id}
                      icon={option.icon}
                      label={option.label}
                      onClick={() => navigateTo(option.id)}
                    />
                  ))}
                </div>
              ) : (
                <AccountSettings />
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
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
