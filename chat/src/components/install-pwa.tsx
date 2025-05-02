'use client';
import { useState, useEffect } from 'react';
import { Share2, Plus, Menu, MoreVertical, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@uidotdev/usehooks';

export function PwaInstallBanner() {
  const [deviceType, setDeviceType] = useState<
    'ios' | 'android' | 'other' | null
  >(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isMobile = useMediaQuery('only screen and (max-width : 768px)');

  useEffect(() => {
    // Check if banner was previously dismissed
    const bannerDismissed = sessionStorage.getItem('pwa-banner-dismissed');
    if (bannerDismissed) {
      setDismissed(true);
    }

    // Detect if app is already installed (in standalone mode)
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    // Detect device type
    const userAgent =
      navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setDeviceType('ios');
    } else if (/android/i.test(userAgent)) {
      setDeviceType('android');
    } else {
      setDeviceType('other');
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
  };

  // Don't render anything if not on mobile, already installed, or dismissed
  if (!isMobile || isStandalone || dismissed) {
    return null;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 rounded-full p-2">
              <Download className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Install App</h3>
              <p className="text-xs text-gray-500">
                Add to home screen for better experience
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDismiss}>
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              Install
            </Button>
          </div>
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Install this app</DrawerTitle>
            <DrawerDescription>
              Add this app to your home screen for quick and easy access
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto">
            {deviceType === 'ios' && <IOSInstructions />}
            {deviceType === 'android' && <AndroidInstructions />}
            {deviceType === 'other' && <OtherInstructions />}
          </div>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function IOSInstructions() {
  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start gap-4">
        <div className="bg-gray-100 rounded-full p-3 flex-shrink-0">
          <Share2 className="h-6 w-6 text-gray-700" />
        </div>
        <div>
          <h3 className="font-medium mb-1">Step 1</h3>
          <p className="text-gray-600 text-sm">
            Tap the Share button in Safari
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="bg-gray-100 rounded-full p-3 flex-shrink-0">
          <Plus className="h-6 w-6 text-gray-700" />
        </div>
        <div>
          <h3 className="font-medium mb-1">Step 2</h3>
          <p className="text-gray-600 text-sm">
            Scroll down and tap "Add to Home Screen"
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="bg-gray-100 rounded-full p-3 flex-shrink-0">
          <Download className="h-6 w-6 text-gray-700" />
        </div>
        <div>
          <h3 className="font-medium mb-1">Step 3</h3>
          <p className="text-gray-600 text-sm">
            Tap "Add" in the top right corner
          </p>
        </div>
      </div>
    </div>
  );
}

function AndroidInstructions() {
  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start gap-4">
        <div className="bg-gray-100 rounded-full p-3 flex-shrink-0">
          <MoreVertical className="h-6 w-6 text-gray-700" />
        </div>
        <div>
          <h3 className="font-medium mb-1">Step 1</h3>
          <p className="text-gray-600 text-sm">Tap the menu icon in Chrome</p>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="bg-gray-100 rounded-full p-3 flex-shrink-0">
          <Download className="h-6 w-6 text-gray-700" />
        </div>
        <div>
          <h3 className="font-medium mb-1">Step 2</h3>
          <p className="text-gray-600 text-sm">
            Tap "Install app" or "Add to Home screen"
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="bg-gray-100 rounded-full p-3 flex-shrink-0">
          <Plus className="h-6 w-6 text-gray-700" />
        </div>
        <div>
          <h3 className="font-medium mb-1">Step 3</h3>
          <p className="text-gray-600 text-sm">
            Tap "Add" or "Install" in the prompt
          </p>
        </div>
      </div>
    </div>
  );
}

function OtherInstructions() {
  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start gap-4">
        <div className="bg-gray-100 rounded-full p-3 flex-shrink-0">
          <Menu className="h-6 w-6 text-gray-700" />
        </div>
        <div>
          <h3 className="font-medium mb-1">Step 1</h3>
          <p className="text-gray-600 text-sm">
            Open your browser's menu (usually in the top right)
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="bg-gray-100 rounded-full p-3 flex-shrink-0">
          <Plus className="h-6 w-6 text-gray-700" />
        </div>
        <div>
          <h3 className="font-medium mb-1">Step 2</h3>
          <p className="text-gray-600 text-sm">
            Look for "Install app" or "Add to Home screen" option
          </p>
        </div>
      </div>
    </div>
  );
}
