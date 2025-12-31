import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UNITS, getCompatibleUnits, convertUnit, formatNumber, getAllUnits } from '@/lib/units';
import type { ParsedIngredient } from '@/lib/parser';
import { Check, ChevronDown } from 'lucide-react';

interface IngredientRowProps {
  ingredient: ParsedIngredient;
  scale: number;
  useFractions: boolean;
  onToggleChecked: () => void;
  onUnitChange: (newUnit: string) => void;
}

export const IngredientRow = forwardRef<HTMLDivElement, IngredientRowProps>(function IngredientRow({
  ingredient,
  scale,
  useFractions,
  onToggleChecked,
  onUnitChange,
}, ref) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const scaledQuantity = ingredient.quantity !== null 
    ? ingredient.quantity * scale 
    : null;
  
  const scaledParenQuantity = ingredient.parentheticalQuantity !== null 
    ? ingredient.parentheticalQuantity * scale 
    : null;

  // Get compatible units if there's a recognized unit, otherwise show all units if there's a quantity
  const compatibleUnits = ingredient.unit 
    ? getCompatibleUnits(ingredient.unit) 
    : (ingredient.quantity !== null ? getAllUnits() : []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-dropdown]')) return;
    onToggleChecked();
  };

  const buildDisplayText = (): string => {
    let text = '';
    
    if (scaledQuantity !== null) {
      text += formatNumber(scaledQuantity, useFractions);
    }
    
    if (ingredient.unit) {
      const unitInfo = UNITS[ingredient.unit];
      text += ` ${unitInfo?.name || ingredient.unit}`;
    }
    
    text += ` ${ingredient.ingredient}`;
    
    if (scaledParenQuantity !== null && ingredient.parentheticalUnit) {
      const parenUnitInfo = UNITS[ingredient.parentheticalUnit];
      text += ` (${formatNumber(scaledParenQuantity, useFractions)}${parenUnitInfo?.name || ingredient.parentheticalUnit})`;
    } else if (ingredient.parenthetical) {
      // For parentheticals we couldn't parse, just show scaled if numeric
      const numMatch = ingredient.parenthetical.match(/^([\d.]+)(.*)$/);
      if (numMatch) {
        const num = parseFloat(numMatch[1]);
        text += ` (${formatNumber(num * scale, useFractions)}${numMatch[2]})`;
      } else {
        text += ` (${ingredient.parenthetical})`;
      }
    }
    
    return text.trim();
  };

  return (
    <motion.div
      className={`ingredient-row ${ingredient.checked ? 'checked' : ''}`}
      onClick={handleRowClick}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      data-testid="ingredient-row"
    >
      {/* Checkbox */}
      <motion.div 
        className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
          ingredient.checked 
            ? 'bg-primary border-primary' 
            : 'border-border hover:border-primary/50'
        }`}
        whileTap={{ scale: 0.9 }}
      >
        {ingredient.checked && (
          <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
        )}
      </motion.div>

      {/* Ingredient text */}
      <span className={`flex-1 ingredient-text ${ingredient.checked ? 'line-through text-muted-foreground' : ''}`}>
        {buildDisplayText()}
      </span>

      {/* Unit conversion dropdown */}
      {scaledQuantity !== null && compatibleUnits.length > 0 && (
        <div className="relative" ref={dropdownRef} data-dropdown>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(!isDropdownOpen);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            data-testid="unit-dropdown-trigger"
          >
            <span>{ingredient.unit ? UNITS[ingredient.unit]?.name || ingredient.unit : 'Convert'}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {isDropdownOpen && (
            <motion.div
              className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-card z-50 min-w-[180px] py-1 overflow-hidden max-h-64 overflow-y-auto"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {compatibleUnits.map(unitKey => {
                const unitInfo = UNITS[unitKey];
                const converted = ingredient.unit 
                  ? convertUnit(scaledQuantity || 0, ingredient.unit, unitKey)
                  : null;
                
                return (
                  <button
                    key={unitKey}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnitChange(unitKey);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-secondary flex justify-between items-center gap-4 transition-colors"
                  >
                    <span className="font-medium">{unitInfo.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {converted !== null ? formatNumber(converted, useFractions) : '—'}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
});
