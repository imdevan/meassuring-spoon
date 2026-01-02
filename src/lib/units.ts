// Unit conversion data and utilities
// Water density: 1ml = 1g for liquid/weight cross-conversion

export type UnitCategory = 'volume' | 'weight' | 'count';

export interface UnitInfo {
  name: string;
  abbrev: string[];
  category: UnitCategory;
  toBase: number; // Convert to base unit (ml for volume, g for weight)
}

export const UNITS: Record<string, UnitInfo> = {
  // Volume units (base: ml)
  ml: { name: 'milliliter', abbrev: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'], category: 'volume', toBase: 1 },
  l: { name: 'liter', abbrev: ['l', 'liter', 'liters', 'litre', 'litres'], category: 'volume', toBase: 1000 },
  tsp: { name: 'teaspoon', abbrev: ['tsp', 'teaspoon', 'teaspoons', 't'], category: 'volume', toBase: 4.929 },
  tbsp: { name: 'tablespoon', abbrev: ['tbsp', 'tablespoon', 'tablespoons', 'T', 'Tbsp'], category: 'volume', toBase: 14.787 },
  cup: { name: 'cup', abbrev: ['cup', 'cups', 'c'], category: 'volume', toBase: 236.588 },
  floz: { name: 'oz', abbrev: ['fl oz', 'fluid oz', 'fluid ounce', 'fluid ounces', 'fl. oz.', 'oz'], category: 'volume', toBase: 29.574 },
  pint: { name: 'pint', abbrev: ['pint', 'pints', 'pt'], category: 'volume', toBase: 473.176 },
  quart: { name: 'quart', abbrev: ['quart', 'quarts', 'qt'], category: 'volume', toBase: 946.353 },
  gallon: { name: 'gallon', abbrev: ['gallon', 'gallons', 'gal'], category: 'volume', toBase: 3785.41 },

  // Weight units (base: g)
  g: { name: 'gram', abbrev: ['g', 'gram', 'grams', 'gr'], category: 'weight', toBase: 1 },
  kg: { name: 'kilogram', abbrev: ['kg', 'kilogram', 'kilograms', 'kilo', 'kilos'], category: 'weight', toBase: 1000 },
  mg: { name: 'milligram', abbrev: ['mg', 'milligram', 'milligrams'], category: 'weight', toBase: 0.001 },
  oz: { name: 'ounces', abbrev: ['ounce', 'ounces'], category: 'weight', toBase: 28.3495 },
  lb: { name: 'pound', abbrev: ['lb', 'lbs', 'pound', 'pounds'], category: 'weight', toBase: 453.592 },

  // Count units
  piece: { name: 'piece', abbrev: ['piece', 'pieces', 'pc', 'pcs'], category: 'count', toBase: 1 },
  dozen: { name: 'dozen', abbrev: ['dozen', 'doz'], category: 'count', toBase: 12 },
};

// Find unit by any of its abbreviations
export function findUnit(text: string): string | null {
  const normalized = text.toLowerCase().trim();
  for (const [key, unit] of Object.entries(UNITS)) {
    if (unit.abbrev.some(a => a.toLowerCase() === normalized)) {
      return key;
    }
  }
  return null;
}

// Convert between units (supports cross-category volume/weight via water density)
export function convertUnit(value: number, fromUnit: string, toUnit: string): number | null {
  const from = UNITS[fromUnit];
  const to = UNITS[toUnit];
  
  if (!from || !to) {
    return null;
  }

  // Same category - direct conversion
  if (from.category === to.category) {
    const baseValue = value * from.toBase;
    return baseValue / to.toBase;
  }

  // Cross-category: volume <-> weight using water density (1ml = 1g)
  if ((from.category === 'volume' && to.category === 'weight') ||
      (from.category === 'weight' && to.category === 'volume')) {
    // Convert to base unit first (ml or g, which are equal for water)
    const baseValue = value * from.toBase;
    // Convert from base to target unit
    return baseValue / to.toBase;
  }

  return null;
}

// Get compatible units for conversion (includes cross-category volume/weight)
export function getCompatibleUnits(unitKey: string): string[] {
  const unit = UNITS[unitKey];
  if (!unit) return [];
  
  // For volume and weight, show both categories
  if (unit.category === 'volume' || unit.category === 'weight') {
    return Object.entries(UNITS)
      .filter(([key, u]) => (u.category === 'volume' || u.category === 'weight') && key !== unitKey)
      .map(([key]) => key);
  }
  
  // For other categories (count), only same category
  return Object.entries(UNITS)
    .filter(([key, u]) => u.category === unit.category && key !== unitKey)
    .map(([key]) => key);
}

// Get all available units (for ingredients without a recognized unit)
export function getAllUnits(): string[] {
  return Object.keys(UNITS);
}

// Common fractions for display
const FRACTION_MAP: [number, string][] = [
  [0.125, '⅛'],
  [0.25, '¼'],
  [0.333, '⅓'],
  [0.375, '⅜'],
  [0.5, '½'],
  [0.625, '⅝'],
  [0.666, '⅔'],
  [0.75, '¾'],
  [0.875, '⅞'],
];

// Convert decimal to fraction string
export function decimalToFraction(value: number): string {
  if (value === 0) return '0';
  
  const whole = Math.floor(value);
  const decimal = value - whole;
  
  if (decimal < 0.0625) {
    return whole.toString();
  }
  
  // Find closest fraction
  let closest = FRACTION_MAP[0];
  let minDiff = Math.abs(decimal - closest[0]);
  
  for (const [frac, sym] of FRACTION_MAP) {
    const diff = Math.abs(decimal - frac);
    if (diff < minDiff) {
      minDiff = diff;
      closest = [frac, sym];
    }
  }
  
  if (whole === 0) {
    return closest[1];
  }
  
  return `${whole}${closest[1]}`;
}

// Parse fraction string to decimal
export function fractionToDecimal(text: string): number | null {
  const clean = text.trim();
  
  // Check for unicode fractions
  const unicodeFractions: Record<string, number> = {
    '⅛': 0.125, '¼': 0.25, '⅓': 0.333, '⅜': 0.375,
    '½': 0.5, '⅝': 0.625, '⅔': 0.666, '¾': 0.75, '⅞': 0.875,
  };
  
  // Handle mixed numbers with unicode fractions
  for (const [frac, val] of Object.entries(unicodeFractions)) {
    if (clean.includes(frac)) {
      const parts = clean.split(frac);
      const whole = parts[0] ? parseFloat(parts[0]) : 0;
      return whole + val;
    }
  }
  
  // Handle slash fractions like "1/2" or "1 1/2"
  const slashMatch = clean.match(/^(\d+)?\s*(\d+)\/(\d+)$/);
  if (slashMatch) {
    const whole = slashMatch[1] ? parseFloat(slashMatch[1]) : 0;
    const num = parseFloat(slashMatch[2]);
    const denom = parseFloat(slashMatch[3]);
    return whole + (num / denom);
  }
  
  // Plain number
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

// Format number based on display preference
export function formatNumber(value: number, useFractions: boolean): string {
  if (useFractions) {
    return decimalToFraction(value);
  }
  // Round to 2 decimal places
  return value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
}
