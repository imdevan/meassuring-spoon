import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useState } from 'react';

interface InstructionStepProps {
  step: number;
  text: string;
  isComplete: boolean;
  onToggle: () => void;
}

function InstructionStep({ step, text, isComplete, onToggle }: InstructionStepProps) {
  return (
    <motion.div
      className={`flex gap-4 p-4 rounded-xl cursor-pointer transition-colors ${
        isComplete ? 'bg-secondary/30 opacity-60' : 'hover:bg-secondary/30'
      }`}
      onClick={onToggle}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: step * 0.05 }}
    >
      <motion.div 
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
          isComplete 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-secondary text-secondary-foreground'
        }`}
        whileTap={{ scale: 0.9 }}
      >
        {isComplete ? (
          <Check className="w-4 h-4" strokeWidth={3} />
        ) : (
          step
        )}
      </motion.div>
      <p className={`flex-1 pt-1 ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
        {text}
      </p>
    </motion.div>
  );
}

interface InstructionsListProps {
  instructions: string[];
}

export function InstructionsList({ instructions }: InstructionsListProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (step: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(step)) {
        next.delete(step);
      } else {
        next.add(step);
      }
      return next;
    });
  };

  if (instructions.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        Paste your recipe instructions here
      </p>
    );
  }

  return (
    <div className="space-y-2" data-testid="instructions-list">
      {instructions.map((instruction, idx) => (
        <InstructionStep
          key={idx}
          step={idx + 1}
          text={instruction}
          isComplete={completedSteps.has(idx)}
          onToggle={() => toggleStep(idx)}
        />
      ))}
    </div>
  );
}
