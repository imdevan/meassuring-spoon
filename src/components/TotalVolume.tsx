import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Copy, Check } from 'lucide-react';
import type { ParsedSection } from '@/lib/parser';
import { UNITS, convertUnit, formatNumber, getCompatibleUnits, isImperialUnit } from '@/lib/units';

interface TotalVolumeProps {
  sections: ParsedSection[];
  scale: number;
  useFractions: boolean;
}

export function TotalVolume({ sections, scale, useFractions }: TotalVolumeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Calculate total volume in ml (base unit)
  const totalData = useMemo(() => {
    let totalMl = 0;
    let hasVolume = false;
    let firstVolumeUnit: string | null = null;

    for (const section of sections) {
      for (const ingredient of section.ingredients) {
        if (ingredient.quantity && ingredient.unit) {
          const unitInfo = UNITS[ingredient.unit];
          if (unitInfo && unitInfo.category === 'volume') {
            const scaledQty = ingredient.quantity * scale;
            const inMl = convertUnit(scaledQty, ingredient.unit, 'ml');
            if (inMl !== null) {
              totalMl += inMl;
              hasVolume = true;
              if (!firstVolumeUnit) {
                firstVolumeUnit = ingredient.unit;
              }
            }
          }
        }
      }
    }

    return { totalMl, hasVolume, firstVolumeUnit };
  }, [sections, scale]);

  // Determine display unit (use selected or default based on first ingredient)
  const displayUnit = selectedUnit || totalData.firstVolumeUnit || 'cup';
  const preferImperial = totalData.firstVolumeUnit ? isImperialUnit(totalData.firstVolumeUnit) : true;

  // Convert total to display unit
  const displayValue = useMemo(() => {
    if (!totalData.hasVolume) return null;
    return convertUnit(totalData.totalMl, 'ml', displayUnit);
  }, [totalData.totalMl, totalData.hasVolume, displayUnit]);

  // Get compatible units for dropdown
  const compatibleUnits = useMemo(() => {
    return getCompatibleUnits(displayUnit, preferImperial).filter(u => UNITS[u].category === 'volume');
  }, [displayUnit, preferImperial]);

  const handleUnitSelect = (unit: string) => {
    setSelectedUnit(unit);
    setIsOpen(false);
  };

  const handleCopy = () => {
    if (displayValue === null) return;
    const unitInfo = UNITS[displayUnit];
    const text = `${formatNumber(displayValue, useFractions)} ${unitInfo?.name || displayUnit}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!totalData.hasVolume || displayValue === null) {
    return null;
  }

  const unitInfo = UNITS[displayUnit];

  return (
    <div className="relative flex justify-end">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-1 py-2"
      >
        <span>
          Total: {formatNumber(displayValue, useFractions)} {unitInfo?.name || displayUnit}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden min-w-[140px]"
            >
              <div className="max-h-48 overflow-y-auto py-1">
                {[displayUnit, ...compatibleUnits].map((unitKey) => {
                  const unit = UNITS[unitKey];
                  const converted = convertUnit(totalData.totalMl, 'ml', unitKey);
                  if (converted === null || !unit) return null;

                  return (
                    <button
                      key={unitKey}
                      onClick={() => handleUnitSelect(unitKey)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-secondary/50 transition-colors flex items-center justify-between gap-2 ${
                        unitKey === displayUnit ? 'bg-secondary/30' : ''
                      }`}
                    >
                      <span className="text-muted-foreground">
                        {formatNumber(converted, useFractions)} {unit.name}
                      </span>
                      {unitKey === displayUnit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy();
                          }}
                          className="p-1 hover:bg-secondary rounded"
                        >
                          {copied ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
