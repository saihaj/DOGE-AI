import React from 'react';
import { Button, ButtonProps } from './ui/button';
import { cn } from '@/lib/utils';
import { CheckIcon, ClipboardIcon } from 'lucide-react';

export async function copyToClipboardWithMeta(value: string) {
  navigator.clipboard.writeText(value);
}

interface CopyButtonProps extends ButtonProps {
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
      className={cn('relative z-10 h-6 w-6 [&_svg]:h-3 [&_svg]:w-3', className)}
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
