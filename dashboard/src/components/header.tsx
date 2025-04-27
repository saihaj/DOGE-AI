import { cn } from '@/lib/utils';
import { SidebarTrigger } from './ui/sidebar';

export function Header({
  right,
  className,
}: {
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex items-center p-4 border-b border-secondary-foreground/30 h-14',
        className,
      )}
    >
      <div className="flex-1 flex justify-start">
        <SidebarTrigger />
      </div>
      <h1 className="text-xl font-semibold">DOGEai</h1>
      <div className="flex-1 flex justify-end">{right}</div>
    </header>
  );
}
