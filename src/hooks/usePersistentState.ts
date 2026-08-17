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

  useEffect(() => {
    valueRef.current = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Persistence is best-effort until the API layer is connected.
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
          const payload = await response.json() as StateResponse<T>;
          lastServerUpdateRef.current = payload.updatedAt ?? Date.now();
          serverVersionRef.current = payload.version ?? serverVersionRef.current + 1;
          if (valueRef.current === valueBeingSynced) {
            dirtyRef.current = false;
          } else {
            dirtyRef.current = true;
            syncQueuedRef.current = true;
          }
        } else if (response.status === 409) {
          const conflict = await response.json() as { current?: StateResponse<T> };
          const current = conflict.current ?? { value: null, updatedAt: 0, version: 0 };
          lastServerUpdateRef.current = current.updatedAt ?? 0;
          serverVersionRef.current = current.version ?? 0;
          try {
            localStorage.setItem(`foodiehub.sync-conflict.${key}`, JSON.stringify({
              localValue: valueBeingSynced,
              serverValue: current.value,
              serverUpdatedAt: current.updatedAt ?? 0,
              serverVersion: current.version ?? 0,
              detectedAt: new Date().toISOString(),
            }));
          } catch {
            // Keep the in-memory local value if browser storage is unavailable.
          }
          dirtyRef.current = false;
          syncQueuedRef.current = false;
          window.dispatchEvent(new CustomEvent('foodiehub-sync-conflict', { detail: { key } }));
        }
      } catch {
        // Keep the dirty flag set so the next poll retries when the server returns.
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
        // Browser storage may be unavailable.
      }
    };
    const handleConflictResolution = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; resolution?: 'server' | 'local' }>).detail;
      if (detail?.key !== key || !detail.resolution) return;
      let conflict: StoredConflict<T> | null = null;
      try {
        const raw = localStorage.getItem(conflictStorageKey);
        conflict = raw ? JSON.parse(raw) as StoredConflict<T> : null;
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
        // Best effort cleanup.
      }
      window.dispatchEvent(new CustomEvent('foodiehub-sync-conflict-resolved', { detail: { key } }));
    };
    window.addEventListener('foodiehub-sync-resolve', handleConflictResolution);
    const conflictAnnouncementId = window.setTimeout(announceStoredConflict, 0);

    const hydrate = async () => {
      try {
        const response = await fetch(`/api/state/${encodeURIComponent(key)}`);
        if (!response.ok) return;
        const payload = await response.json() as StateResponse<T>;
        lastServerUpdateRef.current = payload.updatedAt ?? 0;
        serverVersionRef.current = payload.version ?? 0;

        if (payload.value !== undefined && payload.value !== null) {
          if (!dirtyRef.current && !cancelled) {
            applyingServerValueRef.current = true;
            setValue(payload.value);
          }
        } else if (!cancelled) {
          dirtyRef.current = true;
        }
      } catch {
        // Local storage remains the offline source until the LAN server returns.
      } finally {
        if (cancelled) return;
        hydratedRef.current = true;
        if (dirtyRef.current) void syncLatest();
      }
    };

    void hydrate();
    const pollId = window.setInterval(async () => {
      if (cancelled) return;
      if (dirtyRef.current) {
        void syncLatest();
        return;
      }
      try {
        const response = await fetch(`/api/state/${encodeURIComponent(key)}`);
        if (!response.ok) return;
        const payload = await response.json() as StateResponse<T>;
        const updatedAt = payload.updatedAt ?? 0;
        const serverVersion = payload.version ?? serverVersionRef.current;
        if (payload.value !== undefined && payload.value !== null && (updatedAt > lastServerUpdateRef.current || serverVersion > serverVersionRef.current)) {
          lastServerUpdateRef.current = updatedAt;
          serverVersionRef.current = serverVersion;
          applyingServerValueRef.current = true;
          setValue(payload.value);
        } else if (payload.value === undefined || payload.value === null) {
          dirtyRef.current = true;
          void syncLatest();
        }
      } catch {
        // The app continues using its local cache while Wi-Fi is unavailable.
      }
    }, 2000);

    return () => {
      cancelled = true;
      syncLatestRef.current = null;
      window.removeEventListener('foodiehub-sync-resolve', handleConflictResolution);
      window.clearTimeout(conflictAnnouncementId);
      window.clearInterval(pollId);
    };
  }, [key]);

  useEffect(() => {
    if (!valueEffectMountedRef.current) {
      valueEffectMountedRef.current = true;
      return;
    }
    if (applyingServerValueRef.current) {
      applyingServerValueRef.current = false;
      return;
    }
    if (!hydratedRef.current) {
      dirtyRef.current = true;
      return;
    }
    dirtyRef.current = true;
    void syncLatestRef.current?.();
  }, [key, value]);

  return [value, setValue] as const;
}
