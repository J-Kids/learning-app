/**
 * OCR Post-Processing Cleaner
 * Strips Tesseract badge artifacts (e.g. E83, Ed, KB) while preserving legitimate words and numbers.
 */

export function cleanExtractedText(rawText) {
  if (!rawText) return '';

  return rawText
    .split('\n')
    .map(line => {
      let cleanedLine = line.trim();
      // Remove standalone single character artifacts except 'a', 'A', 'I', and any digit (0-9)
      cleanedLine = cleanedLine.replace(/\b(?![aAI0-9])\w\b/g, '');
      // Strip UI badge noise patterns like E83, KB, Ed
      cleanedLine = cleanedLine.replace(/\b(E\d+|KB|Ed|PDF|Scan)\b/gi, '');
      return cleanedLine.trim();
    })
    .filter(line => line.length > 0)
    .join('\n');
}
