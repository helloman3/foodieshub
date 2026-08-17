import { useEffect, useRef, useState } from 'react';

interface StateResponse<T> {
  value?: T | null;
  updatedAt?: number;
  version?: number;
}

interface StoredConflict<T> {
  localValue: T;
  serverValue: T | null;
  serverUpdatedAt: number;
  serverVersion: number;
  detectedAt: string;
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue ? (JSON.parse(storedValue) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const valueRef = useRef(value);
  const hydratedRef = useRef(false);
  const valueEffectMountedRef = useRef(false);
  const dirtyRef = useRef(false);
  const syncingRef = useRef(false);
  const syncQueuedRef = useRef(false);
  const applyingServerValueRef = useRef(false);
  const lastServerUpdateRef = useRef(0);
  const serverVersionRef = useRef(0);
  const syncLatestRef = useRef<(() => Promise<void>) | null>(null);

  // Keep ref synchronized and update localStorage
  useEffect(() => {
    valueRef.current = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // LocalStorage is best-effort fallback
    }
  }, [key, value]);

  useEffect(() => {
    let cancelled = false;

    const syncLatest = async (): Promise<void> => {
      if (cancelled) return;
      if (syncingRef.current) {
        syncQueuedRef.current = true;
        return;
      }

      syncingRef.current = true;
      syncQueuedRef.current = false;
      const valueBeingSynced = valueRef.current;
      try {
        const response = await fetch(`/api/state/${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: valueBeingSynced, expectedVersion: serverVersionRef.current }),
        });

        if (response.ok) {
          const payload = (await response.json()) as StateResponse<T>;
          lastServerUpdateRef.current = payload.updatedAt ?? Date.now();
          serverVersionRef.current = payload.version ?? serverVersionRef.current + 1;
          if (valueRef.current === valueBeingSynced) {
            dirtyRef.current = false;
          } else {
            dirtyRef.current = true;
            syncQueuedRef.current = true;
          }
        } else if (response.status === 409) {
          const conflict = (await response.json()) as { current?: StateResponse<T> };
          const current = conflict.current ?? { value: null, updatedAt: 0, version: 0 };
          lastServerUpdateRef.current = current.updatedAt ?? 0;
          serverVersionRef.current = current.version ?? 0;

          // If the conflict happened on an unmodified initial load or client has null, auto-adopt server
          if (!hydratedRef.current || JSON.stringify(valueBeingSynced) === JSON.stringify(initialValue)) {
            if (current.value !== undefined && current.value !== null) {
              applyingServerValueRef.current = true;
              setValue(current.value);
              dirtyRef.current = false;
              syncQueuedRef.current = false;
              return;
            }
          }

          try {
            localStorage.setItem(
              `foodiehub.sync-conflict.${key}`,
              JSON.stringify({
                localValue: valueBeingSynced,
                serverValue: current.value,
                serverUpdatedAt: current.updatedAt ?? 0,
                serverVersion: current.version ?? 0,
                detectedAt: new Date().toISOString(),
              })
            );
          } catch {
            // Keep in memory
          }
          dirtyRef.current = false;
          syncQueuedRef.current = false;
          window.dispatchEvent(new CustomEvent('foodiehub-sync-conflict', { detail: { key } }));
        }
      } catch {
        // Retry on next poll
      } finally {
        syncingRef.current = false;
        if (!cancelled && syncQueuedRef.current && dirtyRef.current) {
          void syncLatest();
        }
      }
    };
    syncLatestRef.current = syncLatest;

    const conflictStorageKey = `foodiehub.sync-conflict.${key}`;
    const announceStoredConflict = () => {
      try {
        if (localStorage.getItem(conflictStorageKey)) {
          window.dispatchEvent(new CustomEvent('foodiehub-sync-conflict', { detail: { key } }));
        }
      } catch {
        // Storage unavailable
      }
    };

    const handleConflictResolution = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; resolution?: 'server' | 'local' }>).detail;
      if (detail?.key !== key || !detail.resolution) return;
      let conflict: StoredConflict<T> | null = null;
      try {
        const raw = localStorage.getItem(conflictStorageKey);
        conflict = raw ? (JSON.parse(raw) as StoredConflict<T>) : null;
      } catch {
        conflict = null;
      }
      if (!conflict) return;

      if (detail.resolution === 'server') {
        applyingServerValueRef.current = true;
        setValue(conflict.serverValue ?? initialValue);
        lastServerUpdateRef.current = conflict.serverUpdatedAt;
        serverVersionRef.current = conflict.serverVersion;
        dirtyRef.current = false;
        syncQueuedRef.current = false;
      } else {
        lastServerUpdateRef.current = conflict.serverUpdatedAt;
        serverVersionRef.current = conflict.serverVersion;
        dirtyRef.current = true;
        syncQueuedRef.current = true;
        void syncLatest();
      }
      try {
        localStorage.removeItem(conflictStorageKey);
      } catch {
        // Cleanup
      }
      window.dispatchEvent(new CustomEvent('foodiehub-sync-conflict-resolved', { detail: { key } }));
    };

    window.addEventListener('foodiehub-sync-resolve', handleConflictResolution);
    const conflictAnnouncementId = window.setTimeout(announceStoredConflict, 0);

    // Initial server hydration
    const hydrate = async () => {
      try {
        const response = await fetch(`/api/state/${encodeURIComponent(key)}`);
        if (!response.ok) return;
        const payload = (await response.json()) as StateResponse<T>;
        const serverVer = payload.version ?? 0;
        const serverUpd = payload.updatedAt ?? 0;

        if (payload.value !== undefined && payload.value !== null) {
          lastServerUpdateRef.current = serverUpd;
          serverVersionRef.current = serverVer;
          applyingServerValueRef.current = true;
          setValue(payload.value);
          dirtyRef.current = false;
        } else if (!cancelled) {
          // Server is empty for this key; seed initial value to server
          dirtyRef.current = true;
        }
      } catch {
        // Offline / fallback to localStorage
      } finally {
        if (cancelled) return;
        hydratedRef.current = true;
        if (dirtyRef.current) {
          void syncLatest();
        }
      }
    };

    void hydrate();

    // High-frequency polling (every 1.5 seconds) for multi-device sync
    const pollId = window.setInterval(async () => {
      if (cancelled) return;
      if (dirtyRef.current) {
        void syncLatest();
        return;
      }
      try {
        const response = await fetch(`/api/state/${encodeURIComponent(key)}`);
        if (!response.ok) return;
        const payload = (await response.json()) as StateResponse<T>;
        const updatedAt = payload.updatedAt ?? 0;
        const serverVersion = payload.version ?? serverVersionRef.current;
        if (payload.value !== undefined && payload.value !== null) {
          if (updatedAt > lastServerUpdateRef.current || serverVersion > serverVersionRef.current) {
            lastServerUpdateRef.current = updatedAt;
            serverVersionRef.current = serverVersion;
            applyingServerValueRef.current = true;
            setValue(payload.value);
          }
        }
      } catch {
        // Offline / error fallback
      }
    }, 1500);

    return () => {
      cancelled = true;
      syncLatestRef.current = null;
      window.removeEventListener('foodiehub-sync-resolve', handleConflictResolution);
      window.clearTimeout(conflictAnnouncementId);
      window.clearInterval(pollId);
    };
  }, [key]);

  // Sync state changes triggered by user/app updates
  useEffect(() => {
    if (!valueEffectMountedRef.current) {
      valueEffectMountedRef.current = true;
      return;
    }
    if (applyingServerValueRef.current) {
      applyingServerValueRef.current = false;
      return;
    }
    dirtyRef.current = true;
    void syncLatestRef.current?.();
  }, [key, value]);

  return [value, setValue] as const;
}
