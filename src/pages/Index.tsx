import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { SideMenu } from '@/components/SideMenu';
import { DropZone } from '@/components/DropZone';
import { IngredientList } from '@/components/IngredientList';
import { InstructionsList } from '@/components/InstructionsList';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { parseRecipeText, parseInstructions, type ParsedRecipe } from '@/lib/parser';
import { encodeRecipeToHash, decodeRecipeFromHash, updateUrlHash, getUrlHash } from '@/lib/state';
import { convertUnit } from '@/lib/units';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useTheme } from '@/hooks/useTheme';
import { Trash2 } from 'lucide-react';

const SCALE_VALUES = [
  0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9,
  1,
  1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10,
];

function findClosestScale(value: number): number {
  let closest = SCALE_VALUES[0];
  let minDiff = Math.abs(value - closest);
  for (const sv of SCALE_VALUES) {
    const diff = Math.abs(value - sv);
    if (diff < minDiff) {
      minDiff = diff;
      closest = sv;
    }
  }
  return closest;
}

export default function Index() {
  const [recipe, setRecipe] = useState<ParsedRecipe>({
    sections: [],
    notes: '',
    instructions: [],
  });
  const [scale, setScale] = useState(1);
  const [useFractions, setUseFractions] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { isActive: cookMode, isSupported: cookModeSupported, toggle: toggleCookMode } = useWakeLock();
  const { resolvedTheme, toggleTheme } = useTheme();

  const hasRecipe = recipe.sections.length > 0;

  // Load state from URL hash on mount
  useEffect(() => {
    const hash = getUrlHash();
    if (hash) {
      const decoded = decodeRecipeFromHash(hash);
      if (decoded) {
        setRecipe(decoded.recipe);
        setScale(decoded.scale);
        setUseFractions(decoded.useFractions);
      }
    }
  }, []);

  // Save state to URL hash when it changes
  useEffect(() => {
    if (hasRecipe) {
      const hash = encodeRecipeToHash(recipe, scale, useFractions);
      updateUrlHash(hash);
    } else {
      updateUrlHash('');
    }
  }, [recipe, scale, useFractions, hasRecipe]);

  const handleTextReceived = useCallback((text: string) => {
    const parsed = parseRecipeText(text);
    setRecipe(parsed);
    setScale(1);
  }, []);

  const handleScaleChange = useCallback((newScale: number) => {
    const closest = findClosestScale(newScale);
    setScale(closest);
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

  const handlePrint = useCallback(() => {
    window.print();
    setIsMenuOpen(false);
  }, []);

  const handleClearRecipe = useCallback(() => {
    setRecipe({ sections: [], notes: '', instructions: [] });
    setScale(1);
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
        onOpenMenu={() => setIsMenuOpen(true)}
        hasRecipe={hasRecipe}
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
                <motion.button
                  onClick={handleClearRecipe}
                  className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  whileTap={{ scale: 0.95 }}
                  title="Clear recipe"
                >
                  <Trash2 className="w-5 h-5" />
                </motion.button>
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
      />
    </div>
  );
}
