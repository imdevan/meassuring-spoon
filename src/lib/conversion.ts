// Conversion mode utilities
import { findUnit, fractionToDecimal } from './units';

export interface ConversionInput {
  quantity: number;
  unit: string;
}

// Storage key for last conversion
const LAST_CONVERSION_KEY = 'measuring-spoon-last-conversion';

// Parse a single unit measurement like "1 cup", "2 tbsp", "500ml"
export function parseSingleMeasurement(text: string): ConversionInput | null {
  const clean = text.trim();
  if (!clean) return null;
  
  // Match quantity (including fractions and decimals) followed by unit
  const pattern = /^([\d\s\/⅛¼⅓⅜½⅝⅔¾⅞.]+)\s*([a-zA-Z.]+\.?)$/;
  const match = clean.match(pattern);
  
  if (!match) return null;
  
  const [, qtyStr, unitStr] = match;
  const quantity = fractionToDecimal(qtyStr.trim());
  const unit = findUnit(unitStr.trim());
  
  if (quantity === null || !unit) return null;
  
  return { quantity, unit };
}

// Check if input text is a single measurement (for conversion mode detection)
export function isSingleMeasurement(text: string): boolean {
  // Should be a single line with just a quantity and unit
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length !== 1) return false;
  
  return parseSingleMeasurement(lines[0]) !== null;
}

// Save last conversion to localStorage
export function saveLastConversion(input: ConversionInput): void {
  try {
    localStorage.setItem(LAST_CONVERSION_KEY, JSON.stringify({
      quantity: 1, // Always save as 1 unit
      unit: input.unit,
    }));
  } catch {
    // Ignore storage errors
  }
}

// Load last conversion from localStorage (defaults to 1 cup)
export function loadLastConversion(): ConversionInput {
  try {
    const stored = localStorage.getItem(LAST_CONVERSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.unit) {
        return { quantity: 1, unit: parsed.unit };
      }
    }
  } catch {
    // Ignore storage errors
  }
  
  // Default: 1 cup
  return { quantity: 1, unit: 'cup' };
}
