import { findUnit, fractionToDecimal } from './units';

export interface ParsedIngredient {
  id: string;
  original: string;
  quantity: number | null;
  unit: string | null;
  ingredient: string;
  parenthetical: string | null;
  parentheticalQuantity: number | null;
  parentheticalUnit: string | null;
  checked: boolean;
  isFraction: boolean;
}

export interface ParsedSection {
  id: string;
  title: string;
  ingredients: ParsedIngredient[];
}

export interface ParsedRecipe {
  sections: ParsedSection[];
  notes: string;
  instructions: string[];
}

// Sanitize input text
function sanitizeInput(text: string): string {
  // Remove HTML tags
  const withoutHtml = text.replace(/<[^>]*>/g, '');
  // Remove URLs
  const withoutUrls = withoutHtml.replace(/https?:\/\/[^\s]+/g, '');
  // Normalize whitespace
  return withoutUrls.replace(/\s+/g, ' ').trim();
}

// Check if a line is a section header
function isSectionHeader(line: string): boolean {
  const headerPatterns = [
    /^ingredients?:?$/i,
    /^recipe:?$/i,
    /^for the /i,
    /^(cake|frosting|filling|sauce|topping|crust|dough|batter|glaze):?$/i,
  ];
  
  const clean = line.trim().toLowerCase();
  
  // Short lines that end with : are likely headers
  if (clean.length < 40 && clean.endsWith(':')) {
    return true;
  }
  
  return headerPatterns.some(p => p.test(clean));
}

// Check if line should be removed (top-level header)
function isTopLevelHeader(line: string): boolean {
  const topHeaders = [
    /^ingredients?$/i,
    /^recipe$/i,
    /^directions?$/i,
    /^instructions?$/i,
  ];
  return topHeaders.some(p => p.test(line.trim()));
}

// Generate unique ID
let idCounter = 0;
function generateId(): string {
  return `ing_${Date.now()}_${idCounter++}`;
}

// Parse a single ingredient line
export function parseIngredientLine(line: string): ParsedIngredient | null {
  const clean = sanitizeInput(line).trim();
  if (!clean || clean.length < 2) return null;
  
  // Check for parenthetical content like (50g)
  const parenMatch = clean.match(/\(([^)]+)\)/);
  let parenthetical = parenMatch ? parenMatch[1] : null;
  let parentheticalQuantity: number | null = null;
  let parentheticalUnit: string | null = null;
  
  if (parenthetical) {
    const parenParsed = parseQuantityAndUnit(parenthetical);
    if (parenParsed) {
      parentheticalQuantity = parenParsed.quantity;
      parentheticalUnit = parenParsed.unit;
    }
  }
  
  // Remove parenthetical for main parsing
  const mainText = clean.replace(/\([^)]+\)/g, '').trim();
  
  // Handle combined quantities like "2 cups + 2 Tbsp" or "2 cups and 2 Tbsp"
  const combinedMatch = mainText.match(/^([\d\s\/⅛¼⅓⅜½⅝⅔¾⅞.]+)\s*(\w+)\s*(?:\+|and)\s*([\d\s\/⅛¼⅓⅜½⅝⅔¾⅞.]+)\s*(\w+)\s+(.+)$/i);
  
  if (combinedMatch) {
    const [, qty1Str, unit1Str, qty2Str, unit2Str, rest] = combinedMatch;
    const unit1 = findUnit(unit1Str);
    const unit2 = findUnit(unit2Str);
    const qty1 = fractionToDecimal(qty1Str);
    const qty2 = fractionToDecimal(qty2Str);
    
    // If same unit, combine
    if (unit1 && unit1 === unit2 && qty1 !== null && qty2 !== null) {
      return {
        id: generateId(),
        original: clean,
        quantity: qty1 + qty2,
        unit: unit1,
        ingredient: rest.trim(),
        parenthetical,
        parentheticalQuantity,
        parentheticalUnit,
        checked: false,
        isFraction: qty1Str.includes('/') || /[⅛¼⅓⅜½⅝⅔¾⅞]/.test(qty1Str),
      };
    }
  }
  
  // Standard parsing: quantity unit ingredient
  const parsed = parseQuantityAndUnit(mainText);
  
  if (!parsed) {
    // No quantity found - might be a plain ingredient
    return {
      id: generateId(),
      original: clean,
      quantity: null,
      unit: null,
      ingredient: clean,
      parenthetical,
      parentheticalQuantity,
      parentheticalUnit,
      checked: false,
      isFraction: false,
    };
  }
  
  return {
    id: generateId(),
    original: clean,
    quantity: parsed.quantity,
    unit: parsed.unit,
    ingredient: parsed.rest,
    parenthetical,
    parentheticalQuantity,
    parentheticalUnit,
    checked: false,
    isFraction: parsed.isFraction,
  };
}

// Parse quantity and unit from start of string
function parseQuantityAndUnit(text: string): { quantity: number; unit: string | null; rest: string; isFraction: boolean } | null {
  const clean = text.trim();
  
  // Match quantity (including fractions and decimals)
  const qtyPattern = /^([\d\s\/⅛¼⅓⅜½⅝⅔¾⅞.]+)/;
  const qtyMatch = clean.match(qtyPattern);
  
  if (!qtyMatch) return null;
  
  const qtyStr = qtyMatch[1].trim();
  const quantity = fractionToDecimal(qtyStr);
  
  if (quantity === null) return null;
  
  const afterQty = clean.slice(qtyMatch[0].length).trim();
  const isFraction = qtyStr.includes('/') || /[⅛¼⅓⅜½⅝⅔¾⅞]/.test(qtyStr);
  
  // Try to match unit
  const unitPattern = /^([a-zA-Z.]+\.?)\s*/;
  const unitMatch = afterQty.match(unitPattern);
  
  if (unitMatch) {
    const unitStr = unitMatch[1];
    const unit = findUnit(unitStr);
    
    if (unit) {
      return {
        quantity,
        unit,
        rest: afterQty.slice(unitMatch[0].length).trim(),
        isFraction,
      };
    }
  }
  
  return {
    quantity,
    unit: null,
    rest: afterQty,
    isFraction,
  };
}

// Parse full recipe text
export function parseRecipeText(text: string): ParsedRecipe {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection = {
    id: generateId(),
    title: '',
    ingredients: [],
  };
  
  for (const line of lines) {
    // Skip top-level headers
    if (isTopLevelHeader(line)) continue;
    
    // Check for section headers
    if (isSectionHeader(line)) {
      if (currentSection.ingredients.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        id: generateId(),
        title: line.replace(/:$/, ''),
        ingredients: [],
      };
      continue;
    }
    
    // Parse as ingredient
    const ingredient = parseIngredientLine(line);
    if (ingredient) {
      currentSection.ingredients.push(ingredient);
    }
  }
  
  // Don't forget the last section
  if (currentSection.ingredients.length > 0) {
    sections.push(currentSection);
  }
  
  return {
    sections,
    notes: '',
    instructions: [],
  };
}

// Parse instructions text
export function parseInstructions(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const instructions: string[] = [];
  let currentInstruction = '';
  
  for (const line of lines) {
    // Check if line starts with a number or bullet
    const isNewStep = /^(\d+[.)]\s*|[-•]\s*)/.test(line);
    
    if (isNewStep) {
      if (currentInstruction) {
        instructions.push(currentInstruction);
      }
      // Remove the number/bullet prefix
      currentInstruction = line.replace(/^(\d+[.)]\s*|[-•]\s*)/, '');
    } else if (currentInstruction) {
      currentInstruction += ' ' + line;
    } else {
      currentInstruction = line;
    }
  }
  
  if (currentInstruction) {
    instructions.push(currentInstruction);
  }
  
  return instructions;
}
