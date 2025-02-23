import { ClientOnly } from '@/components/client-only';
import { Chat } from './chat';

export default function ChatInterface() {
  return (
    <div className="flex flex-col w-full h-dvh overflow-hidden">
      <ClientOnly>
        <Chat />
      </ClientOnly>
    </div>
  );
}
