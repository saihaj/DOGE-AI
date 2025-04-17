import { ClientOnly } from '@/components/client-only';
import { UserChat } from './chat';

export default function Page() {
  return (
    <div className="flex flex-col w-full h-dvh overflow-hidden">
      <ClientOnly>
        <UserChat />
      </ClientOnly>
    </div>
  );
}
