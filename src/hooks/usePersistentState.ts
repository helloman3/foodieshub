import { useEffect, useRef, useState, useCallback } from 'react';

interface StateResponse<T> {
  value?: T | null;
  updatedAt?: number;
  version?: number;
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue !== null ? (JSON.parse(storedValue) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const valueRef = useRef(value);
  const hydratedRef = useRef(false);
  const isServerApplyingRef = useRef(false);
  const lastServerUpdateRef = useRef(0);

  // Sync value to localStorage and valueRef whenever value changes
  useEffect(() => {
    valueRef.current = value;
    try {
      if (value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // Local storage fallback
    }
  }, [key, value]);

  // Function to push a state value directly to the server
  const pushToServer = useCallback(async (valueToPush: T) => {
    try {
      const response = await fetch(`/api/state/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: valueToPush }),
      });
      if (response.ok) {
        const payload = (await response.json()) as StateResponse<T>;
        if (payload.updatedAt) {
          lastServerUpdateRef.current = payload.updatedAt;
        }
      }
    } catch {
      // Network error; will retry on next user interaction or reconnect
    }
  }, [key]);

  // Initial server hydration and background polling for multi-device sync
  useEffect(() => {
    let cancelled = false;

    const fetchServerState = async () => {
      try {
        const response = await fetch(`/api/state/${encodeURIComponent(key)}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as StateResponse<T>;
        const serverUpdatedAt = payload.updatedAt ?? 0;

        if (payload.value !== undefined && payload.value !== null) {
          // If this is the first load (not hydrated yet) OR server has a newer timestamp
          if (!hydratedRef.current || serverUpdatedAt > lastServerUpdateRef.current) {
            lastServerUpdateRef.current = serverUpdatedAt;
            isServerApplyingRef.current = true;
            setValue(payload.value);
            try {
              localStorage.setItem(key, JSON.stringify(payload.value));
            } catch {}
          }
        } else if (!hydratedRef.current) {
          // Server doesn't have this key yet; seed our initial value
          if (valueRef.current !== undefined && valueRef.current !== null) {
            void pushToServer(valueRef.current);
          }
        }
      } catch {
        // Server unreachable; keep local state
      } finally {
        if (!cancelled) {
          hydratedRef.current = true;
        }
      }
    };

    // Run immediate hydration on mount
    void fetchServerState();

    // High-frequency polling (every 1 second) so all devices receive updates in near real-time
    const intervalId = window.setInterval(() => {
      if (!cancelled) {
        void fetchServerState();
      }
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [key, pushToServer]);

  // Wrapper setter that updates local state and immediately broadcasts to the server
  const setPersistentValue = useCallback((updater: React.SetStateAction<T>) => {
    setValue((prev) => {
      const nextValue = typeof updater === 'function' ? (updater as (prevState: T) => T)(prev) : updater;
      // Immediately push user changes to server
      void pushToServer(nextValue);
      return nextValue;
    });
  }, [pushToServer]);

  return [value, setPersistentValue] as const;
}
