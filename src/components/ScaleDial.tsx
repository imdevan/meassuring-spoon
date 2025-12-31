import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const SCALE_VALUES = [
  0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9,
  1,
  1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10,
];

const CENTER_INDEX = SCALE_VALUES.indexOf(1);
const TOTAL_ROTATION = 270; // degrees
const ROTATION_PER_STEP = TOTAL_ROTATION / (SCALE_VALUES.length - 1);

interface ScaleDialProps {
  value: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'lg';
}

export function ScaleDial({ value, onChange, size = 'sm' }: ScaleDialProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  const currentIndex = SCALE_VALUES.indexOf(value);
  const rotation = (currentIndex - CENTER_INDEX) * ROTATION_PER_STEP;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dialRef.current) return;

    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    // Convert angle to index (0 degrees = 3 o'clock, we want 0 at bottom)
    const normalizedAngle = ((angle + 90 + 360) % 360);
    const progress = normalizedAngle / 360;
    
    let newIndex = Math.round(progress * (SCALE_VALUES.length - 1));
    newIndex = Math.max(0, Math.min(SCALE_VALUES.length - 1, newIndex));

    if (SCALE_VALUES[newIndex] !== value) {
      onChange(SCALE_VALUES[newIndex]);
      setInputValue(SCALE_VALUES[newIndex].toString());
    }
  }, [isDragging, value, onChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const num = parseFloat(newValue);
    if (!isNaN(num) && num >= 0.1 && num <= 10) {
      const rounded = Math.round(num * 10) / 10;
      // Find closest scale value
      let closest = SCALE_VALUES[0];
      let minDiff = Math.abs(rounded - closest);
      for (const sv of SCALE_VALUES) {
        const diff = Math.abs(rounded - sv);
        if (diff < minDiff) {
          minDiff = diff;
          closest = sv;
        }
      }
      onChange(closest);
    }
  };

  const handleInputBlur = () => {
    setInputValue(value.toString());
  };

  const sizeClasses = size === 'lg' 
    ? 'w-24 h-24' 
    : 'w-14 h-14';

  const tickCount = 12;

  return (
    <div className="flex items-center gap-3">
      <div 
        ref={dialRef}
        className={`relative ${sizeClasses} cursor-grab active:cursor-grabbing`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        data-testid="scale-dial"
      >
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full bg-card border-2 border-border shadow-card" />
        
        {/* Tick marks */}
        <div className="absolute inset-1">
          {Array.from({ length: tickCount }).map((_, i) => {
            const tickRotation = (i / tickCount) * 360;
            const isMain = i % 3 === 0;
            return (
              <div
                key={i}
                className="absolute top-0 left-1/2 origin-bottom"
                style={{
                  transform: `translateX(-50%) rotate(${tickRotation}deg)`,
                  height: '50%',
                }}
              >
                <div 
                  className={`w-0.5 ${isMain ? 'h-2 bg-foreground/30' : 'h-1 bg-foreground/15'} rounded-full`}
                />
              </div>
            );
          })}
        </div>

        {/* Rotating indicator */}
        <motion.div
          className="absolute inset-3"
          animate={{ rotate: rotation }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="w-full h-full relative">
            {/* Indicator line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-3 bg-primary rounded-full" />
          </div>
        </motion.div>

        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-primary/50" />
        </div>
      </div>

      {/* Value input */}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        className="w-12 text-center text-lg font-medium bg-transparent border-b border-border/50 focus:border-primary outline-none transition-colors"
        data-testid="scale-input"
      />
      <span className="text-sm text-muted-foreground">×</span>
    </div>
  );
}
