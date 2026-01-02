import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { SideMenu } from '@/components/SideMenu';
import { DropZone } from '@/components/DropZone';
import { IngredientList } from '@/components/IngredientList';
import { InstructionsList } from '@/components/InstructionsList';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { parseRecipeText, parseInstructions, type ParsedRecipe } from '@/lib/parser';
import { encodeRecipeToHash, decodeRecipeFromHash, updateUrlWithTitle, getUrlHash, getUrlTitle } from '@/lib/state';
import { convertUnit, UNITS, formatNumber } from '@/lib/units';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/use-mobile';
import { RotateCcw } from 'lucide-react';

export default function Index() {
  const [recipe, setRecipe] = useState<ParsedRecipe>({
    sections: [],
    notes: '',
    instructions: [],
    title: '',
  });
  const [scale, setScale] = useState(1);
  const [useFractions, setUseFractions] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isResetSpinning, setIsResetSpinning] = useState(false);

  const { isActive: cookMode, isSupported: cookModeSupported, toggle: toggleCookMode } = useWakeLock();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  const hasRecipe = recipe.sections.length > 0;

  // Load state from URL hash on mount
  useEffect(() => {
    const hash = getUrlHash();
    const title = getUrlTitle();
    
    if (hash) {
      const decoded = decodeRecipeFromHash(hash);
      if (decoded) {
        setRecipe({ ...decoded.recipe, title });
        setScale(decoded.scale);
        setUseFractions(decoded.useFractions);
      }
    }
  }, []);

  // Save state to URL hash when it changes
  useEffect(() => {
    if (hasRecipe) {
      const hash = encodeRecipeToHash(recipe, scale, useFractions);
      updateUrlWithTitle(hash, recipe.title);
    } else {
      updateUrlWithTitle('', '');
    }
  }, [recipe, scale, useFractions, hasRecipe]);

  const handleTextReceived = useCallback((text: string) => {
    const parsed = parseRecipeText(text);
    setRecipe(parsed);
    setScale(1);
  }, []);

  const handleScaleChange = useCallback((newScale: number) => {
    // Accept any value between 0.1 and 100
    const clamped = Math.max(0.1, Math.min(100, newScale));
    setScale(clamped);
  }, []);

  const handleToggleFractions = useCallback(() => {
    setUseFractions(prev => !prev);
  }, []);

  const handleToggleIngredient = useCallback((sectionId: string, ingredientId: string) => {
    setRecipe(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === sectionId
          ? {
              ...section,
              ingredients: section.ingredients.map(ing =>
                ing.id === ingredientId
                  ? { ...ing, checked: !ing.checked }
                  : ing
              ),
            }
          : section
      ),
    }));
  }, []);

  const handleChangeUnit = useCallback((sectionId: string, ingredientId: string, newUnit: string) => {
    setRecipe(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === sectionId
          ? {
              ...section,
              ingredients: section.ingredients.map(ing => {
                if (ing.id !== ingredientId || !ing.unit || !ing.quantity) return ing;
                
                const converted = convertUnit(ing.quantity, ing.unit, newUnit);
                if (converted === null) return ing;
                
                return {
                  ...ing,
                  quantity: converted,
                  unit: newUnit,
                };
              }),
            }
          : section
      ),
    }));
  }, []);

  const handleDeleteIngredient = useCallback((sectionId: string, ingredientId: string) => {
    setRecipe(prev => ({
      ...prev,
      sections: prev.sections
        .map(section => 
          section.id === sectionId
            ? {
                ...section,
                ingredients: section.ingredients.filter(ing => ing.id !== ingredientId),
              }
            : section
        )
        .filter(section => section.ingredients.length > 0), // Remove empty sections
    }));
  }, []);

  const handleDeleteInstruction = useCallback((index: number) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index),
    }));
  }, []);

  const handleResetCheckboxes = useCallback(() => {
    setRecipe(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        ingredients: section.ingredients.map(ing => ({
          ...ing,
          checked: false,
        })),
      })),
    }));
    setIsMenuOpen(false);
  }, []);

  const handleResetCheckboxesWithAnimation = useCallback(() => {
    setIsResetSpinning(true);
    handleResetCheckboxes();
    setTimeout(() => setIsResetSpinning(false), 500);
  }, [handleResetCheckboxes]);

  const handleNotesChange = useCallback((notes: string) => {
    setRecipe(prev => ({ ...prev, notes }));
  }, []);

  const handleInstructionsChange = useCallback((text: string) => {
    const instructions = text ? parseInstructions(text) : [];
    setRecipe(prev => ({ ...prev, instructions }));
  }, []);

  const handleTitleChange = useCallback((title: string) => {
    setRecipe(prev => ({ ...prev, title }));
  }, []);

  const handlePrint = useCallback(() => {
    // Build plain text for printing
    const lines: string[] = [];
    
    // Title
    if (recipe.title) {
      lines.push(recipe.title);
      lines.push('='.repeat(recipe.title.length));
      lines.push('');
    }
    
    // Notes
    if (recipe.notes) {
      lines.push('Notes:');
      lines.push(recipe.notes);
      lines.push('');
    }
    
    // Ingredients
    if (recipe.sections.length > 0) {
      lines.push('Ingredients:');
      for (const section of recipe.sections) {
        if (section.title) {
          lines.push(`  ${section.title}`);
        }
        for (const ing of section.ingredients) {
          let line = '  • ';
          if (ing.quantity !== null) {
            const scaled = ing.quantity * scale;
            line += formatNumber(scaled, useFractions);
          }
          if (ing.unit) {
            const unitInfo = UNITS[ing.unit];
            line += ` ${unitInfo?.name || ing.unit}`;
          }
          line += ` ${ing.ingredient}`;
          if (ing.parentheticalQuantity !== null && ing.parentheticalUnit) {
            const scaledParen = ing.parentheticalQuantity * scale;
            const parenUnitInfo = UNITS[ing.parentheticalUnit];
            line += ` (${formatNumber(scaledParen, useFractions)} ${parenUnitInfo?.name || ing.parentheticalUnit})`;
          } else if (ing.parenthetical) {
            line += ` (${ing.parenthetical})`;
          }
          lines.push(line.trim());
        }
      }
      lines.push('');
    }
    
    // Instructions
    if (recipe.instructions.length > 0) {
      lines.push('Instructions:');
      recipe.instructions.forEach((inst, idx) => {
        lines.push(`  ${idx + 1}. ${inst}`);
      });
    }
    
    // Create a printable element
    const printContent = lines.join('\n');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${recipe.title || 'Recipe'}</title>
            <style>
              body {
                font-family: 'Georgia', serif;
                line-height: 1.6;
                max-width: 600px;
                margin: 40px auto;
                padding: 20px;
                white-space: pre-wrap;
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    
    setIsMenuOpen(false);
  }, [recipe, scale, useFractions]);

  const handleClearRecipe = useCallback(() => {
    setRecipe({ sections: [], notes: '', instructions: [], title: '' });
    setScale(1);
    setIsMenuOpen(false);
  }, []);

  const instructionsText = useMemo(() => {
    return recipe.instructions.map((inst, idx) => `${idx + 1}. ${inst}`).join('\n');
  }, [recipe.instructions]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        scale={scale}
        onScaleChange={handleScaleChange}
        useFractions={useFractions}
        onToggleFractions={handleToggleFractions}
        cookMode={cookMode}
        onToggleCookMode={toggleCookMode}
        cookModeSupported={cookModeSupported}
        isDark={resolvedTheme === 'dark'}
        onToggleTheme={toggleTheme}
        hasRecipe={hasRecipe}
        onResetCheckboxes={handleResetCheckboxes}
        onOpenMenu={() => setIsMenuOpen(true)}
      />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Drop zone / Empty state */}
        <DropZone onTextReceived={handleTextReceived} isEmpty={!hasRecipe} />

        {/* Recipe content */}
        {hasRecipe && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Title input */}
            <div className="glass-card p-4">
              <input
                type="text"
                value={recipe.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Recipe title (optional)"
                className="w-full text-xl font-display bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
                data-testid="recipe-title-input"
              />
            </div>

            {/* Notes section */}
            <CollapsibleSection
              title="Notes"
              placeholder="Add any notes about this recipe..."
              value={recipe.notes}
              onChange={handleNotesChange}
              testId="notes-section"
            />

            {/* Ingredients */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display">Ingredients</h2>
                <motion.button
                  onClick={handleResetCheckboxesWithAnimation}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  whileTap={{ scale: 0.95 }}
                  title="Reset checkboxes"
                >
                  <motion.div
                    animate={{ rotate: isResetSpinning ? -360 : 0 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  >
                    <RotateCcw className="w-5 h-5" />
                  </motion.div>
                </motion.button>
              </div>
              
              <IngredientList
                sections={recipe.sections}
                scale={scale}
                useFractions={useFractions}
                onToggleIngredient={handleToggleIngredient}
                onChangeUnit={handleChangeUnit}
                onDeleteIngredient={handleDeleteIngredient}
              />
            </div>

            {/* Instructions section */}
            <CollapsibleSection
              title="Instructions"
              placeholder="Paste recipe instructions here..."
              value={instructionsText}
              onChange={handleInstructionsChange}
              renderContent={() => (
                <InstructionsList 
                  instructions={recipe.instructions} 
                  onDeleteInstruction={handleDeleteInstruction}
                />
              )}
              testId="instructions-section"
            />
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground no-print">
        <p>Made with 🥄 for cooks who love precision</p>
      </footer>

      {/* Side menu */}
      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        scale={scale}
        onScaleChange={handleScaleChange}
        useFractions={useFractions}
        onToggleFractions={handleToggleFractions}
        cookMode={cookMode}
        onToggleCookMode={toggleCookMode}
        cookModeSupported={cookModeSupported}
        isDark={resolvedTheme === 'dark'}
        onToggleTheme={toggleTheme}
        onReset={handleResetCheckboxes}
        onPrint={handlePrint}
        onClearRecipe={handleClearRecipe}
        isMobile={isMobile}
      />
    </div>
  );
}
