import { SidebarTrigger } from './ui/sidebar';

export function Header({ right }: { right?: React.ReactNode }) {
  return (
    <header className="flex items-center p-4 border-b border-secondary-foreground/30 h-14">
      <div className="flex-1 flex justify-start">
        <SidebarTrigger />
      </div>
      <h1 className="text-xl font-semibold">DOGEai</h1>
      <div className="flex-1 flex justify-end">{right}</div>
    </header>
  );
}
