import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Clipboard, ArrowRight } from 'lucide-react';

interface DropZoneProps {
  onTextReceived: (text: string) => void;
  isEmpty: boolean;
}

export function DropZone({ onTextReceived, isEmpty }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
    if (text) {
      onTextReceived(text);
    }
  }, [onTextReceived]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (isEmpty) {
      e.preventDefault();
      const text = e.clipboardData.getData('text');
      if (text) {
        onTextReceived(text);
      }
    }
  }, [isEmpty, onTextReceived]);

  const handleSubmit = useCallback(() => {
    if (pasteText.trim()) {
      onTextReceived(pasteText.trim());
      setPasteText('');
    }
  }, [pasteText, onTextReceived]);

  // Global paste handler for empty state
  const handleGlobalPaste = useCallback((e: React.ClipboardEvent) => {
    const target = e.target as HTMLElement;
    // Don't intercept if user is typing in notes or instructions
    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
      if (target.closest('[data-no-global-paste]')) {
        return;
      }
    }
    
    if (isEmpty) {
      const text = e.clipboardData.getData('text');
      if (text) {
        e.preventDefault();
        onTextReceived(text);
      }
    }
  }, [isEmpty, onTextReceived]);

  if (!isEmpty) {
    return null;
  }

  return (
    <motion.div
      className={`drop-zone ${isDragOver ? 'active' : ''} p-8 sm:p-12`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handleGlobalPaste}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      data-testid="drop-zone"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <motion.div
          className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center"
          animate={isDragOver ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
        >
          {isDragOver ? (
            <Upload className="w-10 h-10 text-primary" />
          ) : (
            <Clipboard className="w-10 h-10 text-primary" />
          )}
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-2xl">Paste your recipe</h2>
          <p className="text-muted-foreground max-w-md">
            Drop or paste any ingredient list and watch it transform into an adjustable recipe
          </p>
        </div>

        <div className="w-full max-w-md space-y-4">
          <textarea
            ref={textareaRef}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            onPaste={handlePaste}
            placeholder="Paste ingredients here..."
            className="w-full h-40 p-4 rounded-xl bg-secondary/50 border border-border/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            data-testid="paste-textarea"
          />

          <motion.button
            onClick={handleSubmit}
            disabled={!pasteText.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={pasteText.trim() ? { scale: 1.02 } : undefined}
            whileTap={pasteText.trim() ? { scale: 0.98 } : undefined}
            data-testid="parse-button"
          >
            <span>Parse Ingredients</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>

        <p className="text-sm text-muted-foreground">
          Tip: You can also drag text directly from any website
        </p>
      </div>
    </motion.div>
  );
}
