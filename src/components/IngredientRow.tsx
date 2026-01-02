import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { UNITS, getCompatibleUnits, convertUnit, formatNumber } from '@/lib/units';
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [isScrolling, setIsScrolling] = useState(false);

  const scaledQuantity = ingredient.quantity !== null 
    ? ingredient.quantity * scale 
    : null;
  
  const scaledParenQuantity = ingredient.parentheticalQuantity !== null 
    ? ingredient.parentheticalQuantity * scale 
    : null;

  // Only show dropdown if ingredient has a recognized unit
  const hasUnit = ingredient.unit !== null;
  const compatibleUnits = hasUnit ? getCompatibleUnits(ingredient.unit!) : [];

  // Update dropdown position
  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: buttonRect.bottom + 4, // mt-1 = 4px
        right: window.innerWidth - buttonRect.right,
      });
    }
  };

  // Update dropdown position when it opens or on scroll/resize
  useEffect(() => {
    if (isDropdownOpen) {
      updateDropdownPosition();
      
      const handleScroll = () => updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isDropdownOpen]);

  // Handle scroll detection for scrollbar visibility
  useEffect(() => {
    const dropdown = dropdownRef.current;
    if (!dropdown || !isDropdownOpen) return;

    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 1000); // Hide scrollbar 1 second after scrolling stops
    };

    dropdown.addEventListener('scroll', handleScroll);
    
    return () => {
      dropdown.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isDropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
          setIsDropdownOpen(false);
        }
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

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

      {/* Unit conversion dropdown - only show if ingredient has a unit */}
      {hasUnit && compatibleUnits.length > 0 && (
        <div className="relative" data-dropdown>
          <button
            ref={buttonRef}
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(!isDropdownOpen);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            data-testid="unit-dropdown-trigger"
          >
            <span>{UNITS[ingredient.unit!]?.name || ingredient.unit}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {isDropdownOpen && typeof document !== 'undefined' && createPortal(
            <motion.div
              ref={dropdownRef}
              className={`fixed bg-card border border-border rounded-xl shadow-card z-50 min-w-[200px] py-1 overflow-hidden max-h-72 overflow-y-auto conversion-dropdown ${isScrolling ? 'scrolling' : ''}`}
              style={{
                top: `${dropdownPosition.top}px`,
                right: `${dropdownPosition.right}px`,
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {/* Volume section */}
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-secondary/30">
                Volume
              </div>
              {compatibleUnits
                .filter(unitKey => UNITS[unitKey].category === 'volume')
                .map(unitKey => {
                  const unitInfo = UNITS[unitKey];
                  const converted = convertUnit(scaledQuantity || 0, ingredient.unit!, unitKey);
                  
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
              
              {/* Weight section */}
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-secondary/30 mt-1">
                Weight
              </div>
              {compatibleUnits
                .filter(unitKey => UNITS[unitKey].category === 'weight')
                .map(unitKey => {
                  const unitInfo = UNITS[unitKey];
                  const converted = convertUnit(scaledQuantity || 0, ingredient.unit!, unitKey);
                  
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
            </motion.div>,
            document.body
          )}
        </div>
      )}
    </motion.div>
  );
});
