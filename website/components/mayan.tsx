'use client';
import { useState, useEffect } from 'react';
import Script from 'next/script';

export function Mayan() {
  const [mayanLoaded, setMayanLoaded] = useState(false);

  useEffect(() => {
    // @ts-expect-error - ignore for now
    if (mayanLoaded && typeof window !== 'undefined' && window.MayanSwap) {
      try {
        console.log('MayanSwap SDK loaded');
        const config = {
          appIdentity: {
            name: 'DOGEai',
            icon: '/logo.jpg',
            uri: 'https://dogeai.info',
          },
          setDefaultToken: true,
          destinationChains: ['solana'],
          tokens: {
            to: {
              solana: ['9UYAYvVS2cZ3BndbsoG1ScJbjfwyEPGxjE79hh5ipump'],
            },
          },
          rpcs: {
            solana:
              'https://rpc.hellomoon.io/2105a23c-5fb3-41dd-adfa-8d1ac542795b',
          },
          colors: {
            mainBox: '#0B0C14',
            background: '#0B0C14',
          },
        };
        // @ts-expect-error - Initialize the MayanSwap widget
        window.MayanSwap.init('swap_widget', config);
      } catch (error) {
        console.error('Error initializing MayanSwap:', error);
      }
    }

    // Cleanup function to reset the widget
    return () => {
      try {
        // Remove the widget's content
        const widget = document.getElementById('swap_widget');
        if (widget) {
          widget.innerHTML = ''; // Clear the widget's DOM
        }
        // Optionally, reset MayanSwap state if the SDK provides a method
        // @ts-expect-error - ignore
        if (window.MayanSwap && typeof window.MayanSwap.reset === 'function') {
          // @ts-expect-error - ignore
          window.MayanSwap.reset(); // Hypothetical reset method
        }
      } catch (error) {
        console.error('Error during MayanSwap cleanup:', error);
      }
    };
  }, [mayanLoaded]);

  return (
    <>
      <Script
        src="https://cdn.mayan.finance/mayan_widget_v_1_2_3.js"
        crossOrigin="anonymous"
        onLoad={() => {
          setTimeout(() => setMayanLoaded(true), 100);
        }}
        onError={() => {
          console.error('Failed to load MayanSwap script');
          setMayanLoaded(false);
        }}
      />
      <div id="swap_widget" />
    </>
  );
}
