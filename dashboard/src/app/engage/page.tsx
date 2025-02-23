'use client';
import { EngagementTweet } from '@/components/engagement';
import { Header } from '@/components/header';
import type React from 'react';

export default function EngagementPage() {
  return (
    <>
      <Header />
      <EngagementTweet
        label="Enter Tweet URL to Engage with"
        apiPath="/api/test/engage"
      />
    </>
  );
}
