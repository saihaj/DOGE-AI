'use client';
import { usePrivy } from '@privy-io/react-auth';
import React, { useEffect } from 'react';

export function ForceLogin() {
  const { login, authenticated } = usePrivy();

  useEffect(() => {
    if (!authenticated) {
      login();
    }

    // as soon as page loads we want to show the login modal if not authenticated
  }, []);

  return <div data-id="force-login" />;
}
