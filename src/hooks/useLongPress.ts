import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
}

export function useLongPress({ onLongPress, onClick, delay = 500 }: UseLongPressOptions) {
  const [isPressed, setIsPressed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    // Prevent text selection on long press
    e.preventDefault();
    
    isLongPressRef.current = false;
    setIsPressed(true);
    
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
      setIsPressed(false);
    }, delay);
  }, [onLongPress, delay]);

  const stop = useCallback((e: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    setIsPressed(false);
    
    if (shouldTriggerClick && !isLongPressRef.current && onClick) {
      onClick();
    }
  }, [onClick]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressed(false);
  }, []);

  return {
    isPressed,
    handlers: {
      onMouseDown: start,
      onMouseUp: (e: React.MouseEvent) => stop(e),
      onMouseLeave: (e: React.MouseEvent) => stop(e, false),
      onTouchStart: start,
      onTouchEnd: (e: React.TouchEvent) => stop(e),
      onTouchCancel: cancel,
    },
  };
}
