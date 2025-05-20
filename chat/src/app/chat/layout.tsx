'use client';

import React from 'react';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex w-full h-full overflow-hidden">{children}</div>;
}
