export const MENU_EXTRACTION_PROMPT = `Return ONLY raw JSON (no markdown) for the menu in this image:
{"categories":[{"name":"slug","displayName":"Name","items":[{"name":"Item","description":"","price":0.0,"currency":"INR"}]}]}
Rules: slug=lowercase-hyphens, price=number (0 if unclear), currency=INR unless stated, omit description if blank, group by section.`;
