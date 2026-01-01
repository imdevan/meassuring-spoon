import { useCallback, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const SCALE_VALUES = [
  0.1, 0.125, 0.25, 0.5, 0.75, 0.875,
  1,
  1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5,
];

// Find index of 1 (center point)
const CENTER_INDEX = SCALE_VALUES.indexOf(1);
const TOTAL_STEPS = SCALE_VALUES.length - 1;

// Max rotation is 135 degrees in each direction from center
const MAX_ROTATION = 135;
const STEPS_BEFORE_CENTER = CENTER_INDEX;
const STEPS_AFTER_CENTER = TOTAL_STEPS - CENTER_INDEX;

// Calculate rotation per step for each side to make 1 in the middle
const ROTATION_PER_STEP_LEFT = MAX_ROTATION / STEPS_BEFORE_CENTER;
const ROTATION_PER_STEP_RIGHT = MAX_ROTATION / STEPS_AFTER_CENTER;

// Evaluate math expression safely
function evaluateMathExpression(expr: string): number | null {
  // Clean the expression
  let cleaned = expr.trim();
  
  // Handle unicode fractions
  const fractionMap: Record<string, number> = {
    '⅛': 0.125, '¼': 0.25, '⅓': 0.333, '⅜': 0.375,
    '½': 0.5, '⅝': 0.625, '⅔': 0.667, '¾': 0.75, '⅞': 0.875,
  };
  
  for (const [frac, val] of Object.entries(fractionMap)) {
    cleaned = cleaned.replace(new RegExp(frac, 'g'), val.toString());
  }
  
  // Handle text fractions like "1/2"
  const fractionMatch = cleaned.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1]);
    const denom = parseFloat(fractionMatch[2]);
    if (denom !== 0) return num / denom;
    return null;
  }
  
  // Handle mixed numbers like "1 1/2"
  const mixedMatch = cleaned.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseFloat(mixedMatch[2]);
    const denom = parseFloat(mixedMatch[3]);
    if (denom !== 0) return whole + num / denom;
    return null;
  }
  
  // Only allow numbers, operators, parentheses, dots, and spaces
  if (!/^[\d+\-*/().\s]+$/.test(cleaned)) {
    return null;
  }
  
  try {
    // Use Function constructor for safer eval
    const result = new Function(`return (${cleaned})`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result;
    }
  } catch {
    return null;
  }
  
  return null;
}

function getRotationForValue(value: number): number {
  // Clamp display value to 5 (max on dial)
  const displayValue = Math.min(value, 5);
  
  // Find the closest scale value for visual representation
  let closestIndex = 0;
  let minDiff = Math.abs(displayValue - SCALE_VALUES[0]);
  
  for (let i = 1; i < SCALE_VALUES.length; i++) {
    const diff = Math.abs(displayValue - SCALE_VALUES[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  
  // Calculate rotation based on index relative to center
  if (closestIndex <= CENTER_INDEX) {
    return -(CENTER_INDEX - closestIndex) * ROTATION_PER_STEP_LEFT;
  } else {
    return (closestIndex - CENTER_INDEX) * ROTATION_PER_STEP_RIGHT;
  }
}

function getValueFromAngle(angle: number): number {
  // Normalize angle to -180 to 180
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  
  // Clamp to our rotation range
  const clampedAngle = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, angle));
  
  // Convert angle to index
  let index: number;
  if (clampedAngle <= 0) {
    // Left side of dial (below 1)
    const stepsFromCenter = Math.abs(clampedAngle) / ROTATION_PER_STEP_LEFT;
    index = Math.round(CENTER_INDEX - stepsFromCenter);
  } else {
    // Right side of dial (above 1)
    const stepsFromCenter = clampedAngle / ROTATION_PER_STEP_RIGHT;
    index = Math.round(CENTER_INDEX + stepsFromCenter);
  }
  
  // Clamp to valid indices
  index = Math.max(0, Math.min(SCALE_VALUES.length - 1, index));
  
  return SCALE_VALUES[index];
}

interface ScaleDialProps {
  value: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'lg';
}

export function ScaleDial({ value, onChange, size = 'sm' }: ScaleDialProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const lastAngleRef = useRef<number | null>(null);
  const accumulatedRotationRef = useRef(0);

  // Sync input when value changes externally
  useEffect(() => {
    if (!isDragging) {
      setInputValue(value.toString());
    }
  }, [value, isDragging]);

  const rotation = getRotationForValue(value);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    // Calculate initial angle
    if (dialRef.current) {
      const rect = dialRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      lastAngleRef.current = angle;
      accumulatedRotationRef.current = rotation;
    }
  }, [rotation]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dialRef.current) return;

    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    
    if (lastAngleRef.current !== null) {
      // Calculate delta angle
      let deltaAngle = currentAngle - lastAngleRef.current;
      
      // Handle wrap-around
      if (deltaAngle > 180) deltaAngle -= 360;
      if (deltaAngle < -180) deltaAngle += 360;
      
      // Update accumulated rotation
      accumulatedRotationRef.current += deltaAngle;
      
      // Clamp accumulated rotation
      accumulatedRotationRef.current = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, accumulatedRotationRef.current));
      
      // Convert to value
      const newValue = getValueFromAngle(accumulatedRotationRef.current);
      
      if (newValue !== value) {
        onChange(newValue);
        setInputValue(newValue.toString());
      }
    }
    
    lastAngleRef.current = currentAngle;
  }, [isDragging, value, onChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    lastAngleRef.current = null;
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const evaluated = evaluateMathExpression(newValue);
    if (evaluated !== null && evaluated >= 0.1 && evaluated <= 100) {
      const rounded = Math.round(evaluated * 100) / 100;
      onChange(rounded);
    }
  };

  const handleInputBlur = () => {
    const evaluated = evaluateMathExpression(inputValue);
    if (evaluated !== null && evaluated >= 0.1 && evaluated <= 100) {
      const rounded = Math.round(evaluated * 100) / 100;
      onChange(rounded);
      setInputValue(rounded.toString());
    } else {
      setInputValue(value.toString());
    }
  };

  const handleClear = () => {
    onChange(1);
    setInputValue('1');
  };

  const sizeClasses = size === 'lg' 
    ? 'w-24 h-24' 
    : 'w-14 h-14';

  const tickCount = 12;

  return (
    <div className="flex items-center gap-3">
      <div 
        ref={dialRef}
        className={`relative ${sizeClasses} cursor-grab active:cursor-grabbing select-none touch-none`}
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
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
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
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleInputBlur()}
          className="w-16 text-center text-lg font-medium bg-transparent border-b border-border/50 focus:border-primary outline-none transition-colors"
          data-testid="scale-input"
        />
        <span className="text-sm text-muted-foreground">×</span>
        {value !== 1 && (
          <motion.button
            onClick={handleClear}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            title="Reset to 1"
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </div>
  );
}
