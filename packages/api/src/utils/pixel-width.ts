// Approximate pixel width for Google SERP snippet simulation
// Uses a simplified font width table based on Arial/Helvetica at 18px (Google's typical title font)
// and 13px for descriptions. Values are approximate.

const charWidths: Record<string, number> = {
  ' ': 3, '!': 4, '"': 6, '#': 8, '$': 7, '%': 11, '&': 9, "'": 3, '(': 5, ')': 5,
  '*': 6, '+': 7, ',': 4, '-': 5, '.': 4, '/': 5, '0': 8, '1': 6, '2': 7, '3': 7,
  '4': 7, '5': 7, '6': 8, '7': 7, '8': 8, '9': 8, ':': 4, ';': 4, '<': 7, '=': 7,
  '>': 7, '?': 7, '@': 11, 'A': 9, 'B': 8, 'C': 9, 'D': 9, 'E': 8, 'F': 7, 'G': 9,
  'H': 9, 'I': 4, 'J': 6, 'K': 8, 'L': 7, 'M': 11, 'N': 9, 'O': 9, 'P': 8, 'Q': 9,
  'R': 8, 'S': 8, 'T': 8, 'U': 9, 'V': 9, 'W': 12, 'X': 8, 'Y': 8, 'Z': 8, '[': 5,
  '\\': 5, ']': 5, '^': 7, '_': 6, '`': 5, 'a': 7, 'b': 7, 'c': 6, 'd': 7, 'e': 7,
  'f': 5, 'g': 7, 'h': 7, 'i': 4, 'j': 4, 'k': 6, 'l': 4, 'm': 10, 'n': 7, 'o': 7,
  'p': 7, 'q': 7, 'r': 5, 's': 6, 't': 5, 'u': 7, 'v': 6, 'w': 9, 'x': 6, 'y': 6,
  'z': 6, '{': 6, '|': 4, '}': 6, '~': 7,
};

const titleFactor = 1.0; // Google title uses ~18px Arial
const descriptionFactor = 13 / 18; // Description uses ~13px Arial
const fallbackWidth = 7;

export function calculatePixelWidth(text: string, type: 'title' | 'description' = 'title'): number {
  if (!text) return 0;
  const factor = type === 'description' ? descriptionFactor : titleFactor;
  let width = 0;
  for (const char of text) {
    width += (charWidths[char] ?? fallbackWidth) * factor;
  }
  return Math.round(width);
}

export function isTitleTruncated(title: string, maxPixels = 561): boolean {
  return calculatePixelWidth(title, 'title') > maxPixels;
}

export function isDescriptionTruncated(description: string, maxPixels = 985): boolean {
  return calculatePixelWidth(description, 'description') > maxPixels;
}
