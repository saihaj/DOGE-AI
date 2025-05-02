'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SettingsSidebar } from '@/components/settings-sidebar';
import { ThemeSettings } from '@/components/theme-settings';
import { NotificationSettings } from '@/components/notification-settings';
import { LanguageSettings } from '@/components/language-settings';
import { AccountSettings } from '@/components/account-settings';

type SettingsTab = 'account' | 'appearance' | 'notifications' | 'language';

export function SettingsDialog() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [settings, setSettings] = useState({
    theme: 'system',
    notifications: {
      email: true,
      push: true,
      updates: false,
    },
    language: 'english',
  });

  const handleSave = () => {
    // Here you would typically persist the settings to your backend or localStorage
    console.log('Saving settings:', settings);
    // Close the dialog after saving
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Settings</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] p-0 gap-0 h-[600px] max-h-[80vh]">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Settings
            </DialogTitle>
            <DialogClose className="h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row h-full overflow-hidden">
          <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'account' && <AccountSettings />}
            {activeTab === 'appearance' && (
              <ThemeSettings
                value={settings.theme}
                onChange={theme => setSettings({ ...settings, theme })}
              />
            )}
            {activeTab === 'notifications' && (
              <NotificationSettings
                value={settings.notifications}
                onChange={notifications =>
                  setSettings({ ...settings, notifications })
                }
              />
            )}
            {activeTab === 'language' && (
              <LanguageSettings
                value={settings.language}
                onChange={language => setSettings({ ...settings, language })}
              />
            )}
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
