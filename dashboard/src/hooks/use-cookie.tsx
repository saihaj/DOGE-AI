import { useState, useEffect } from 'react';

// Custom hook to get cookie value by name
export function useCookie(cookieName: string) {
  const [cookieValue, setCookieValue] = useState<string>('');

  // Function to get cookie value
  const getCookie = (name: string) => {
    if (typeof window === 'undefined') return null; // Ensure client-side only
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const part = parts.pop();
      if (part) return part.split(';').shift();
    }
    return null;
  };

  useEffect(() => {
    const value = getCookie(cookieName) || '';
    setCookieValue(value);
  }, [cookieName]); // Re-run if cookieName changes

  return cookieValue;
}
