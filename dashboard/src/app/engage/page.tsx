'use client';
import { EngagementTweet } from '@/components/engagement';
import type React from 'react';

export default function EngagementPage() {
  return (
    <EngagementTweet
      label="Enter Tweet URL to Engage with"
      apiPath="/api/test/engage"
    />
  );
}
