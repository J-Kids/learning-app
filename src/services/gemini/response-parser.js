/**
 * Gemini Response Parser
 * Safely parses raw text or JSON structures returned by Google AI Studio endpoints.
 *
 * Some models (e.g. gemini-flash-lite-latest) emit literal newlines inside JSON
 * string values instead of \n escape sequences, causing JSON.parse() to throw.
 * fixJsonNewlines() sanitizes these before parsing.
 */

/**
 * Escapes bare newlines and carriage-returns that appear inside JSON string values.
 * Walks the raw string character-by-character tracking quote/escape state so it
 * only touches characters that are genuinely inside a JSON string.
 * @param {string} raw
 * @returns {string}
 */
function fixJsonNewlines(raw) {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) {
      result += ch;
      escaped = false;
    } else if (ch === '\\' && inString) {
      result += ch;
      escaped = true;
    } else if (ch === '"') {
      inString = !inString;
      result += ch;
    } else if (inString && ch === '\n') {
      result += '\\n';
    } else if (inString && ch === '\r') {
      result += '\\r';
    } else {
      result += ch;
    }
  }
  return result;
}

export function parseAiResponse(responseText) {
  if (!responseText) return { title: '', textSource: '', textTranslated: '' };

  let raw = responseText.trim();
  // Strip Markdown code blocks if present (e.g. ```json ... ```)
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // Sanitize literal newlines inside JSON string values before parsing
  const sanitized = fixJsonNewlines(raw);

  try {
    const json = JSON.parse(sanitized);
    return {
      title: json.title || json.chapterTitle || '',
      textSource: json.textSource || json.textEn || json.englishText || json.text || '',
      textTranslated: json.textTranslated || json.translation || json.textHi || json.hindiText || ''
    };
  } catch (e) {
    // If not JSON, treat raw string as the source-language text output
    console.warn('[ResponseParser] JSON.parse failed, using raw text fallback:', e.message);
    return {
      title: '',
      textSource: raw,
      textTranslated: ''
    };
  }
}
