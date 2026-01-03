import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { ParsedSection } from '@/lib/parser';
import { IngredientRow } from './IngredientRow';
import { SwipeToDelete } from './SwipeToDelete';
import { isImperialUnit } from '@/lib/units';

interface IngredientListProps {
  sections: ParsedSection[];
  scale: number;
  useFractions: boolean;
  onToggleIngredient: (sectionId: string, ingredientId: string) => void;
  onChangeUnit: (sectionId: string, ingredientId: string, newUnit: string) => void;
  onDeleteIngredient?: (sectionId: string, ingredientId: string) => void;
}

export const IngredientList = forwardRef<HTMLDivElement, IngredientListProps>(function IngredientList({
  sections,
  scale,
  useFractions,
  onToggleIngredient,
  onChangeUnit,
  onDeleteIngredient,
}, ref) {
  if (sections.length === 0) {
    return null;
  }

  // Detect if recipe uses imperial units by checking the first ingredient with a unit
  const preferImperial = (() => {
    for (const section of sections) {
      for (const ingredient of section.ingredients) {
        if (ingredient.unit) {
          return isImperialUnit(ingredient.unit);
        }
      }
    }
    return true; // Default to imperial
  })();

  return (
    <div className="space-y-6" data-testid="ingredient-list" ref={ref}>
      {sections.map((section, sectionIdx) => (
        <motion.div
          key={section.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sectionIdx * 0.1 }}
        >
          {section.title && (
            <h3 className="text-lg mb-3 px-2">{section.title}</h3>
          )}
          <div className="space-y-1">
            {section.ingredients.map((ingredient) => (
              <SwipeToDelete
                key={ingredient.id}
                onDelete={() => onDeleteIngredient?.(section.id, ingredient.id)}
              >
                <IngredientRow
                  ingredient={ingredient}
                  scale={scale}
                  useFractions={useFractions}
                  preferImperial={preferImperial}
                  onToggleChecked={() => onToggleIngredient(section.id, ingredient.id)}
                  onUnitChange={(newUnit) => onChangeUnit(section.id, ingredient.id, newUnit)}
                />
              </SwipeToDelete>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
});
