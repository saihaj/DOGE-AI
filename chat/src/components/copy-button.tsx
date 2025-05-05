import React from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { CheckIcon, ClipboardIcon } from 'lucide-react';
import { toast } from 'sonner';

export async function copyToClipboardWithMeta(value: string) {
  try {
    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard', {
      dismissible: true,
      position: 'top-center',
    });
  } catch {
    toast.error('Failed to copy to clipboard', {
      dismissible: true,
      position: 'top-center',
    });
  }
}

interface CopyButtonProps extends React.ComponentProps<typeof Button> {
  value: string;
}

export function CopyButton({
  value,
  className,
  variant = 'ghost',
  ...props
}: CopyButtonProps) {
  const [hasCopied, setHasCopied] = React.useState(false);

  React.useEffect(() => {
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  }, [hasCopied]);

  return (
    <Button
      size="icon"
      variant={variant}
      className={cn(
        'relative',
        'z-10 h-6 w-6 [&_svg]:h-3 [&_svg]:w-3',
        'focus:outline-none',
        className,
      )}
      onClick={() => {
        copyToClipboardWithMeta(value);
        setHasCopied(true);
      }}
      {...props}
    >
      <span className="sr-only">Copy</span>
      {hasCopied ? <CheckIcon /> : <ClipboardIcon />}
    </Button>
  );
}
