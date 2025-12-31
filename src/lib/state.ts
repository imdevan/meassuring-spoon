import type { ParsedRecipe } from './parser';

// Encode recipe state to URL hash
export function encodeRecipeToHash(recipe: ParsedRecipe, scale: number, useFractions: boolean): string {
  const state = {
    v: 1, // version
    s: scale,
    f: useFractions,
    sections: recipe.sections.map(section => ({
      id: section.id,
      t: section.title,
      i: section.ingredients.map(ing => ({
        id: ing.id,
        o: ing.original,
        q: ing.quantity,
        u: ing.unit,
        n: ing.ingredient,
        p: ing.parenthetical,
        pq: ing.parentheticalQuantity,
        pu: ing.parentheticalUnit,
        c: ing.checked,
        fr: ing.isFraction,
      })),
    })),
    n: recipe.notes,
    inst: recipe.instructions,
  };
  
  try {
    const json = JSON.stringify(state);
    const encoded = btoa(encodeURIComponent(json));
    return encoded;
  } catch {
    return '';
  }
}

// Decode recipe state from URL hash
export function decodeRecipeFromHash(hash: string): { recipe: ParsedRecipe; scale: number; useFractions: boolean } | null {
  if (!hash || hash.length < 10) return null;
  
  try {
    const json = decodeURIComponent(atob(hash));
    const state = JSON.parse(json);
    
    if (state.v !== 1) return null;
    
    const recipe: ParsedRecipe = {
      sections: state.sections.map((section: any) => ({
        id: section.id,
        title: section.t,
        ingredients: section.i.map((ing: any) => ({
          id: ing.id,
          original: ing.o,
          quantity: ing.q,
          unit: ing.u,
          ingredient: ing.n,
          parenthetical: ing.p,
          parentheticalQuantity: ing.pq,
          parentheticalUnit: ing.pu,
          checked: ing.c,
          isFraction: ing.fr,
        })),
      })),
      notes: state.n || '',
      instructions: state.inst || [],
    };
    
    return {
      recipe,
      scale: state.s || 1,
      useFractions: state.f !== false,
    };
  } catch {
    return null;
  }
}

// Update URL hash without reload
export function updateUrlHash(hash: string): void {
  const newUrl = hash ? `#${hash}` : window.location.pathname;
  window.history.replaceState(null, '', newUrl);
}

// Get current hash
export function getUrlHash(): string {
  return window.location.hash.slice(1);
}
