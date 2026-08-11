/**
 * Gemini Vision Model Candidate Discovery
 * Queries Google AI Studio API (`v1beta/models`) to find exact active vision models for the user's API key.
 */

export async function discoverVisionModels(apiKey) {
  if (!apiKey) return [];

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return [];

    const data = await res.json();
    const allModels = (data.models || []).map(m => (m.name || '').replace(/^models\//, ''));

    // Filter models supporting generateContent with image vision capabilities
    const visionFlashCandidates = allModels.filter(m => {
      const lower = m.toLowerCase();
      return lower.includes('flash') &&
             !lower.includes('pro') &&
             !lower.includes('tts') &&
             !lower.includes('audio') &&
             !lower.includes('embedding') &&
             !lower.includes('bison');
    });

    if (visionFlashCandidates.length > 0) {
      console.log('[Gemini] Discovered active Flash Vision models:', visionFlashCandidates);
      return visionFlashCandidates;
    }
  } catch (err) {
    console.warn('[Gemini] Model auto-discovery failed, using standard fallback candidates:', err);
  }

  // Standard fallback candidate hierarchy
  return [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-8b',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash'
  ];
}
