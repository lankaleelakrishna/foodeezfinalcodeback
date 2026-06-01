import { MenuScanResult } from './types';

export function parseJsonResponse(text: string): MenuScanResult {
  // Strip markdown code fences if present (e.g. ```json ... ```)
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from provider response. Try a clearer photo.');
  }
  try {
    return JSON.parse(jsonMatch[0]) as MenuScanResult;
  } catch (err) {
    const preview = jsonMatch[0].slice(-200);
    const truncated = !jsonMatch[0].trimEnd().endsWith('}');
    throw new Error(
      truncated
        ? 'Provider response was cut off (token limit). Try a smaller menu image or fewer items.'
        : `Provider returned malformed JSON. Try a clearer photo. (tail: ${preview})`,
    );
  }
}
