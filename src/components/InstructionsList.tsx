import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { SwipeToDelete } from './SwipeToDelete';
import { DraggableList, SortableItem } from './DraggableList';
import { EditableItem } from './EditableItem';
import { useLongPress } from '@/hooks/useLongPress';

interface InstructionStepProps {
  step: number;
  text: string;
  isComplete: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onStartEdit: () => void;
  onSave: (newText: string) => void;
  onCancelEdit: () => void;
}

function InstructionStep({ 
  step, 
  text, 
  isComplete, 
  isEditing,
  onToggle, 
  onStartEdit,
  onSave,
  onCancelEdit 
}: InstructionStepProps) {
  const { isPressed, handlers } = useLongPress({
    onLongPress: onStartEdit,
    onClick: onToggle,
    delay: 500,
  });

  if (isEditing) {
    return (
      <div className="p-4 rounded-xl bg-secondary/30">
        <EditableItem
          value={text}
          isEditing={true}
          onSave={onSave}
          onCancel={onCancelEdit}
        >
          <span>{text}</span>
        </EditableItem>
      </div>
    );
  }

  return (
    <motion.div
      className={`flex gap-4 p-4 rounded-xl cursor-pointer transition-colors select-none ${
        isComplete ? 'bg-secondary/30 opacity-60' : 'hover:bg-secondary/30'
      } ${isPressed ? 'bg-secondary/50 scale-[0.98]' : ''}`}
      {...handlers}
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
  onDeleteInstruction?: (index: number) => void;
  onUpdateInstruction?: (index: number, newText: string) => void;
  onReorderInstructions?: (newInstructions: string[]) => void;
}

export function InstructionsList({ 
  instructions, 
  onDeleteInstruction,
  onUpdateInstruction,
  onReorderInstructions 
}: InstructionsListProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const toggleStep = (index: number) => {
    if (editingIndex !== null) return; // Don't toggle when editing
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSave = (index: number, newText: string) => {
    onUpdateInstruction?.(index, newText);
    setEditingIndex(null);
  };

  if (instructions.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        Paste your recipe instructions here
      </p>
    );
  }

  // Create items with IDs for drag and drop
  const items = instructions.map((text, index) => ({
    id: `instruction-${index}`,
    text,
    originalIndex: index,
  }));

  const handleReorder = (newItems: typeof items) => {
    onReorderInstructions?.(newItems.map(item => item.text));
    // Update completed steps to follow the items
    const newCompleted = new Set<number>();
    newItems.forEach((item, newIndex) => {
      if (completedSteps.has(item.originalIndex)) {
        newCompleted.add(newIndex);
      }
    });
    setCompletedSteps(newCompleted);
  };

  return (
    <div data-testid="instructions-list">
      <DraggableList
        items={items}
        getItemId={(item) => item.id}
        onReorder={handleReorder}
        renderItem={(item, index) => (
          <SwipeToDelete
            key={item.id}
            onDelete={() => onDeleteInstruction?.(index)}
          >
            <InstructionStep
              step={index + 1}
              text={item.text}
              isComplete={completedSteps.has(index)}
              isEditing={editingIndex === index}
              onToggle={() => toggleStep(index)}
              onStartEdit={() => setEditingIndex(index)}
              onSave={(newText) => handleSave(index, newText)}
              onCancelEdit={() => setEditingIndex(null)}
            />
          </SwipeToDelete>
        )}
      />
    </div>
  );
}
