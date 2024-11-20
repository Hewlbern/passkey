import React, { useEffect } from 'react';

const VERSION = '3.3.6'; // Update this version number as needed

export function VersionInfo() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, '__passkeys-core-version__', {
        value: VERSION,
        writable: false,
        enumerable: false,
      });
    }
  }, []);

  return null; // This component doesn't render anything
}
