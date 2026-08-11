/**
 * Gemini Response Parser
 * Safely parses raw text or JSON structures returned by Google AI Studio endpoints.
 */

export function parseAiResponse(responseText) {
  if (!responseText) return { title: '', textEn: '', textHi: '' };

  let raw = responseText.trim();
  // Strip Markdown code blocks if present (e.g. ```json ... ```)
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    const json = JSON.parse(raw);
    return {
      title: json.title || json.chapterTitle || '',
      textEn: json.textEn || json.englishText || json.text || '',
      textHi: json.textHi || json.hindiText || json.translation || ''
    };
  } catch (e) {
    // If not JSON, treat raw string as English text output
    return {
      title: '',
      textEn: raw,
      textHi: ''
    };
  }
}
