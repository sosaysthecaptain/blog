"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { initCacheSync, cleanupCacheSync } from "@/lib/cache-sync";

interface CacheContextValue {
  isReady: boolean;
  error: Error | null;
}

const CacheContext = createContext<CacheContextValue>({
  isReady: false,
  error: null,
});

export function useCacheStatus() {
  return useContext(CacheContext);
}

interface CacheProviderProps {
  children: ReactNode;
}

/**
 * CacheProvider - Initializes the local SQLite cache on mount
 * Wrap your app (or the notes section) with this provider
 */
export function CacheProvider({ children }: CacheProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await initCacheSync();
        if (mounted) {
          setIsReady(true);
        }
      } catch (e) {
        console.error("[CacheProvider] Failed to initialize cache:", e);
        if (mounted) {
          setError(e as Error);
          // Still mark as ready so app can fall back to direct Firestore
          setIsReady(true);
        }
      }
    }

    init();

    return () => {
      mounted = false;
      cleanupCacheSync();
    };
  }, []);

  return (
    <CacheContext.Provider value={{ isReady, error }}>
      {children}
    </CacheContext.Provider>
  );
}
