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
  title: string;
}

// Sanitize input text
function sanitizeInput(text: string): string {
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '');
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
  // Remove checkbox-style characters: ▢, □, ☐, ☑, ☒, [x], [ ], - [ ], - [x], etc.
  cleaned = cleaned.replace(/^[\s]*[-*]?\s*(\[[ xX]?\]|▢|□|☐|☑|☒)\s*/gm, '');
  cleaned = cleaned.replace(/[\u25A2\u25A1\u2610\u2611\u2612]/g, '');
  // Normalize whitespace
  return cleaned.replace(/\s+/g, ' ').trim();
}

// Check if a line is a section header for ingredients
function isSectionHeader(line: string): boolean {
  const headerPatterns = [
    /^for the /i,
    /^(cake|frosting|filling|sauce|topping|crust|dough|batter|glaze):?$/i,
  ];
  
  const clean = line.trim().toLowerCase();
  
  // Short lines that end with : are likely headers (but not if they're instructions headers)
  if (clean.length < 40 && clean.endsWith(':') && !isInstructionsHeader(line)) {
    return true;
  }
  
  return headerPatterns.some(p => p.test(clean));
}

// Check if line is an ingredients header
function isIngredientsHeader(line: string): boolean {
  const patterns = [
    /^ingredients?:?$/i,
    /^recipe:?$/i,
  ];
  return patterns.some(p => p.test(line.trim()));
}

// Check if line is an instructions/steps header
function isInstructionsHeader(line: string): boolean {
  const patterns = [
    /^(steps?|directions?|instructions?|method|how[- ]?to|procedures?|preparations?|guide|process):?$/i,
  ];
  return patterns.some(p => p.test(line.trim()));
}

// Check if line should be removed (top-level header)
function isTopLevelHeader(line: string): boolean {
  return isIngredientsHeader(line) || isInstructionsHeader(line);
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
  
  // Handle combined quantities like "2 cups + 2 Tbsp" or "1 and 1/2 teaspoons"
  // Pattern: qty1 unit1? (+ or and) qty2 unit2? rest
  const combinedMatch = mainText.match(/^([\d\s\/⅛¼⅓⅜½⅝⅔¾⅞.]+)\s*([a-zA-Z.]*\.?)?\s*(?:\+|and)\s*([\d\s\/⅛¼⅓⅜½⅝⅔¾⅞.]+)\s*([a-zA-Z.]*\.?)?\s+(.+)$/i);
  
  if (combinedMatch) {
    const [, qty1Str, unit1Str, qty2Str, unit2Str, rest] = combinedMatch;
    const unit1 = unit1Str ? findUnit(unit1Str.trim()) : null;
    const unit2 = unit2Str ? findUnit(unit2Str.trim()) : null;
    const qty1 = fractionToDecimal(qty1Str);
    const qty2 = fractionToDecimal(qty2Str);
    
    if (qty1 !== null && qty2 !== null) {
      // If both have same unit, or one lacks unit, combine them
      if (unit1 && unit1 === unit2) {
        // Same units - combine
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
      } else if (unit1 && !unit2) {
        // First has unit, second doesn't - use first unit for combined
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
      } else if (!unit1 && unit2) {
        // Second has unit, first doesn't - use second unit for combined
        return {
          id: generateId(),
          original: clean,
          quantity: qty1 + qty2,
          unit: unit2,
          ingredient: rest.trim(),
          parenthetical,
          parentheticalQuantity,
          parentheticalUnit,
          checked: false,
          isFraction: qty1Str.includes('/') || /[⅛¼⅓⅜½⅝⅔¾⅞]/.test(qty1Str),
        };
      }
      // Different units - don't combine, fall through to standard parsing
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

// Parse full recipe text - now with auto-detection of ingredients vs instructions sections
export function parseRecipeText(text: string): ParsedRecipe {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection = {
    id: generateId(),
    title: '',
    ingredients: [],
  };
  
  let mode: 'ingredients' | 'instructions' | 'auto' = 'auto';
  const instructionLines: string[] = [];
  
  for (const line of lines) {
    // Check for explicit section headers
    if (isIngredientsHeader(line)) {
      mode = 'ingredients';
      continue;
    }
    
    if (isInstructionsHeader(line)) {
      // Save current ingredient section before switching
      if (currentSection.ingredients.length > 0) {
        sections.push(currentSection);
        currentSection = {
          id: generateId(),
          title: '',
          ingredients: [],
        };
      }
      mode = 'instructions';
      continue;
    }
    
    // Handle based on mode
    if (mode === 'instructions') {
      instructionLines.push(line);
      continue;
    }
    
    // Check for ingredient section headers (like "For the frosting:")
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
  
  // Parse collected instruction lines
  const instructions = instructionLines.length > 0 
    ? parseInstructions(instructionLines.join('\n\n'))
    : [];
  
  return {
    sections,
    notes: '',
    instructions,
    title: '',
  };
}

// Parse instructions text - splits by double newlines (paragraphs)
export function parseInstructions(text: string): string[] {
  // Normalize line endings and split by double newlines (paragraphs)
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const paragraphs = normalized.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  
  // Each paragraph becomes a step - clean up numbering and normalize whitespace
  return paragraphs.map(p => {
    return p
      .replace(/^(\d+[.)]\s*|[-•]\s*)/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }).filter(p => p.length > 0);
}