'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Security Warning Banner
 *
 * Displays a prominent warning when the server is bound to 0.0.0.0,
 * indicating that the service is accessible from the network.
 *
 * Per Golden Rule #3b from prompt.md
 */
export function SecurityBanner() {
  const [isExposed, setIsExposed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [serverHost, setServerHost] = useState<string>('');

  useEffect(() => {
    // Check if user previously dismissed banner in this session
    const dismissed = sessionStorage.getItem('security-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    // Fetch server health to check bind address
    async function checkServerBind() {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();

        // Health endpoint should return bind address
        const host = data.data?.bindAddress || data.data?.host || '127.0.0.1';
        setServerHost(host);

        // Check if bound to 0.0.0.0 (all interfaces)
        if (host === '0.0.0.0' || host === '::' || host === '*') {
          setIsExposed(true);
        }
      } catch (error) {
        console.error('Failed to check server bind address:', error);
      }
    }

    checkServerBind();
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('security-banner-dismissed', 'true');
  };

  // Don't render if not exposed or dismissed
  if (!isExposed || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 dark:bg-red-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="flex items-center flex-1">
            <AlertTriangle className="h-6 w-6 text-white mr-3 flex-shrink-0" />
            <p className="font-medium text-sm sm:text-base">
              <span className="font-bold">Security Warning:</span> Server is exposed on{' '}
              <code className="bg-red-800 dark:bg-red-900 px-2 py-0.5 rounded font-mono text-xs sm:text-sm">
                {serverHost}
              </code>{' '}
              - accessible from network.
              <span className="hidden sm:inline"> This is a local-first tool. For security, bind to 127.0.0.1 only.</span>
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-3 flex-shrink-0 rounded-md p-1.5 hover:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
            aria-label="Dismiss security warning"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 text-xs sm:text-sm text-red-100 dark:text-red-200">
          To fix: Set <code className="bg-red-800 dark:bg-red-900 px-1 py-0.5 rounded font-mono">HOST=127.0.0.1</code> in environment or restart without network binding.
        </div>
      </div>
    </div>
  );
}
