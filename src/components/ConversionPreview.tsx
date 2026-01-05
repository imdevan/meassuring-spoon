import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { UNITS, convertUnit, formatNumber, isImperialUnit } from '@/lib/units';
import { type ConversionInput } from '@/lib/conversion';

interface ConversionPreviewProps {
  input: ConversionInput;
  useFractions: boolean;
  onClick: () => void;
}

export function ConversionPreview({ input, useFractions, onClick }: ConversionPreviewProps) {
  // Convert to a sensible target unit
  const conversion = useMemo(() => {
    const preferImperial = isImperialUnit(input.unit);
    
    // Pick a different target unit based on the input
    let targetUnit: string;
    if (input.unit === 'cup') {
      targetUnit = 'floz';
    } else if (input.unit === 'floz') {
      targetUnit = 'ml';
    } else if (input.unit === 'tsp') {
      targetUnit = 'ml';
    } else if (input.unit === 'tbsp') {
      targetUnit = 'tsp';
    } else if (input.unit === 'ml') {
      targetUnit = preferImperial ? 'floz' : 'l';
    } else if (input.unit === 'l') {
      targetUnit = 'ml';
    } else if (input.unit === 'g') {
      targetUnit = 'massoz';
    } else if (input.unit === 'kg') {
      targetUnit = 'lb';
    } else if (input.unit === 'massoz') {
      targetUnit = 'g';
    } else if (input.unit === 'lb') {
      targetUnit = 'kg';
    } else {
      // Default to ml for volume, g for weight
      const unitInfo = UNITS[input.unit];
      targetUnit = unitInfo?.category === 'weight' ? 'g' : 'ml';
    }

    const converted = convertUnit(input.quantity, input.unit, targetUnit);
    const inputUnitInfo = UNITS[input.unit];
    const targetUnitInfo = UNITS[targetUnit];

    return {
      fromFormatted: formatNumber(input.quantity, useFractions),
      fromUnit: inputUnitInfo?.name || input.unit,
      toFormatted: converted !== null ? formatNumber(converted, useFractions) : '—',
      toUnit: targetUnitInfo?.name || targetUnit,
    };
  }, [input, useFractions]);

  return (
    <motion.button
      onClick={onClick}
      className="flex items-center justify-center gap-3 text-muted-foreground hover:text-foreground transition-colors py-3 px-6 rounded-xl hover:bg-secondary/30"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="font-medium">
        {conversion.fromFormatted} {conversion.fromUnit}
      </span>
      <ArrowRight className="w-4 h-4" />
      <span>
        {conversion.toFormatted} {conversion.toUnit}
      </span>
    </motion.button>
  );
}
