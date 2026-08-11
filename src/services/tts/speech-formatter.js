/**
 * Speech Text Formatter & Number-to-Word Converter
 * Prepares sentence tokens and converts standalone numbers 0-20 to English words ("one", "two", "eleven").
 */

export function numberToEnglishWord(numStr) {
  const num = parseInt(numStr, 10);
  const words = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'
  ];
  if (!isNaN(num) && num >= 0 && num <= 20) {
    return words[num];
  }
  return numStr;
}

export function formatTextForSpeech(text, lang = 'en') {
  if (!text) return '';
  if (lang === 'en') {
    return text.replace(/\b([0-9]|1[0-9]|20)\b/g, (match) => numberToEnglishWord(match));
  }
  return text;
}

export function prepareSentences(text) {
  if (!text) return [];
  return text
    .replace(/([.?!।])\s*(?=[A-Z0-9\u0900-\u097F])/g, "$1|")
    .split("|")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
