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
import { convertUnit } from '@/lib/units';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/use-mobile';
import { RotateCcw, Settings } from 'lucide-react';

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
    window.print();
    setIsMenuOpen(false);
  }, []);

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
                className="w-full text-xl font-medium bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
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
                <h2 className="text-xl">Ingredients</h2>
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={handleResetCheckboxes}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    whileTap={{ scale: 0.95 }}
                    title="Reset checkboxes"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    whileTap={{ scale: 0.95 }}
                    title="Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
              
              <IngredientList
                sections={recipe.sections}
                scale={scale}
                useFractions={useFractions}
                onToggleIngredient={handleToggleIngredient}
                onChangeUnit={handleChangeUnit}
              />
            </div>

            {/* Instructions section */}
            <CollapsibleSection
              title="Instructions"
              placeholder="Paste recipe instructions here..."
              value={instructionsText}
              onChange={handleInstructionsChange}
              renderContent={() => (
                <InstructionsList instructions={recipe.instructions} />
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
