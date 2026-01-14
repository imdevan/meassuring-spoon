import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface EditableItemProps {
  value: string;
  isEditing: boolean;
  onSave: (newValue: string) => void;
  onCancel: () => void;
  children: React.ReactNode;
}

export function EditableItem({ value, isEditing, onSave, onCancel, children }: EditableItemProps) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      setEditValue(value);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isEditing, value]);

  const handleSave = () => {
    if (editValue.trim()) {
      onSave(editValue.trim());
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isEditing) {
    return <>{children}</>;
  }

  return (
    <motion.div
      className="flex items-center gap-2 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <textarea
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 p-2 rounded-lg bg-secondary border border-border text-sm resize-none min-h-[40px]"
        rows={1}
        onBlur={handleSave}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSave();
        }}
        className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
