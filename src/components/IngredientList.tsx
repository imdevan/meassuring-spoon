import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { ParsedSection } from '@/lib/parser';
import { IngredientRow } from './IngredientRow';

interface IngredientListProps {
  sections: ParsedSection[];
  scale: number;
  useFractions: boolean;
  onToggleIngredient: (sectionId: string, ingredientId: string) => void;
  onChangeUnit: (sectionId: string, ingredientId: string, newUnit: string) => void;
}

export const IngredientList = forwardRef<HTMLDivElement, IngredientListProps>(function IngredientList({
  sections,
  scale,
  useFractions,
  onToggleIngredient,
  onChangeUnit,
}, ref) {
  if (sections.length === 0) {
    return null;
  }

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
              <IngredientRow
                key={ingredient.id}
                ingredient={ingredient}
                scale={scale}
                useFractions={useFractions}
                onToggleChecked={() => onToggleIngredient(section.id, ingredient.id)}
                onUnitChange={(newUnit) => onChangeUnit(section.id, ingredient.id, newUnit)}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
});
