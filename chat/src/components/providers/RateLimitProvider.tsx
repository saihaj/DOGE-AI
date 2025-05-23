'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface RateLimitContextType {
  reachedLimitForTheDay: boolean;
  setReachedLimitForTheDay: (reached: boolean) => void;
}

const RateLimitContext = createContext<RateLimitContextType | undefined>(undefined);

export function RateLimitProvider({ children }: { children: ReactNode }) {
  const [reachedLimitForTheDay, setReachedLimitForTheDay] = useState(false);

  return (
    <RateLimitContext.Provider
      value={{
        reachedLimitForTheDay,
        setReachedLimitForTheDay
      }}
    >
      {children}
    </RateLimitContext.Provider>
  );
}

export function useRateLimit() {
  const context = useContext(RateLimitContext);
  if (context === undefined) {
    throw new Error('useRateLimit must be used within a RateLimitProvider');
  }
  return context;
}
