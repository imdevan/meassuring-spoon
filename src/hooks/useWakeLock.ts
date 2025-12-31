import { useState, useEffect, useCallback } from 'react';

interface WakeLockSentinel {
  release: () => Promise<void>;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

export function useWakeLock() {
  const [isActive, setIsActive] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  const request = useCallback(async () => {
    if (!isSupported) return;

    try {
      const sentinel = await (navigator as any).wakeLock.request('screen');
      setWakeLock(sentinel);
      setIsActive(true);

      sentinel.addEventListener('release', () => {
        setIsActive(false);
        setWakeLock(null);
      });
    } catch (err) {
      console.log('Wake Lock request failed:', err);
      setIsActive(false);
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
        setIsActive(false);
      } catch (err) {
        console.log('Wake Lock release failed:', err);
      }
    }
  }, [wakeLock]);

  const toggle = useCallback(async () => {
    if (isActive) {
      await release();
    } else {
      await request();
    }
  }, [isActive, request, release]);

  // Re-request wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive && !wakeLock) {
        request();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, wakeLock, request]);

  return { isActive, isSupported, toggle, request, release };
}
