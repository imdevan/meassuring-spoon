import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { ReactNode, useState, useRef } from 'react';

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
  threshold?: number;
}

export function SwipeToDelete({ children, onDelete, threshold = 140 }: SwipeToDeleteProps) {
  const x = useMotionValue(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const hasDragged = useRef(false);
  
  // Background opacity based on swipe distance
  const backgroundOpacity = useTransform(x, [-threshold, -50, 0, 50, threshold], [1, 0.5, 0, 0.5, 1]);
  const backgroundColorLeft = useTransform(x, [0, threshold], ['hsl(var(--destructive) / 0)', 'hsl(var(--destructive) / 1)']);
  const backgroundColorRight = useTransform(x, [-threshold, 0], ['hsl(var(--destructive) / 1)', 'hsl(var(--destructive) / 0)']);
  
  const handleDragStart = () => {
    hasDragged.current = false;
  };

  const handleDrag = () => {
    // Mark as dragged if moved more than 5px
    if (Math.abs(x.get()) > 5) {
      hasDragged.current = true;
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeDistance = Math.abs(info.offset.x);
    if (swipeDistance > threshold) {
      setIsDeleting(true);
      // Animate off screen then delete
      setTimeout(onDelete, 200);
    }
  };

  // Prevent click events from triggering if user was dragging
  const handleClick = (e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (isDeleting) {
    return (
      <motion.div
        initial={{ height: 'auto', opacity: 1 }}
        animate={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Left background (swipe right to reveal) */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-start px-4 rounded-xl"
        style={{ backgroundColor: backgroundColorLeft, opacity: backgroundOpacity }}
      >
        <div className="flex items-center gap-2 text-destructive-foreground">
          <Trash2 className="w-5 h-5" />
          <span className="font-medium">Remove</span>
        </div>
      </motion.div>
      
      {/* Right background (swipe left to reveal) */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-end px-4 rounded-xl"
        style={{ backgroundColor: backgroundColorRight, opacity: backgroundOpacity }}
      >
        <div className="flex items-center gap-2 text-destructive-foreground">
          <span className="font-medium">Remove</span>
          <Trash2 className="w-5 h-5" />
        </div>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onClickCapture={handleClick}
        className="relative bg-card cursor-grab active:cursor-grabbing touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}