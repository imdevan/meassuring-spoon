import React, { forwardRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  renderContent?: () => React.ReactNode;
  testId?: string;
}

export const CollapsibleSection = forwardRef<HTMLDivElement, CollapsibleSectionProps>(function CollapsibleSection({
  title,
  placeholder,
  value,
  onChange,
  renderContent,
  testId,
}, ref) {
  const [isExpanded, setIsExpanded] = useState(!!value);
  const [isEditing, setIsEditing] = useState(false);

  const hasContent = !!value || (renderContent && value);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on cmd/ctrl+enter or shift+enter
    if ((e.metaKey || e.ctrlKey || e.shiftKey) && e.key === 'Enter') {
      e.preventDefault();
      if (value) {
        setIsEditing(false);
      }
    }
  }, [value]);

  return (
    <div className="glass-card overflow-hidden" data-testid={testId} ref={ref}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg">{title}</h3>
          {hasContent && !isExpanded && (
            <span className="text-sm text-muted-foreground">
              (click to expand)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(!isEditing);
              }}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            <div className="px-6 pb-6">
              {isEditing || !value ? (
                <textarea
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="w-full min-h-[120px] p-4 rounded-xl bg-secondary/50 border border-border/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  autoFocus={isEditing}
                  onBlur={() => {
                    if (value) setIsEditing(false);
                  }}
                />
              ) : renderContent ? (
                renderContent()
              ) : (
                <div className="p-4 rounded-xl bg-secondary/30">
                  <p className="whitespace-pre-wrap">{value}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});