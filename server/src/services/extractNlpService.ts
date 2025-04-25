// Simple parser for extraction prompts
// Supports: "Extract the title, description, and all links from https://example.com"

const DEFAULT_FIELD_SELECTORS: Record<string, string> = {
  title: 'h1',
  description: "meta[name='description']",
  links: 'a[]',
  images: 'img[]',
  paragraphs: 'p[]',
  table: 'table',
};

export function parseExtractPrompt(prompt: string): { url: string | null, selectors: Record<string, string> | null } {
  // Extract URL
  const urlMatch = prompt.match(/https?:\/\/[^\s]+/i);
  const url = urlMatch ? urlMatch[0] : null;
  if (!url) return { url: null, selectors: null };

  // Extract fields (comma-separated, before 'from')
  let fields: string[] = [];
  const fieldsMatch = prompt.match(/extract (.+?) from /i);
  if (fieldsMatch && fieldsMatch[1]) {
    fields = fieldsMatch[1].split(/,| and /i).map(f => f.trim().toLowerCase());
  }
  // Fallback: if prompt contains "all links", "all images", etc.
  if (fields.length === 0) {
    if (/all links/i.test(prompt)) fields.push('links');
    if (/all images/i.test(prompt)) fields.push('images');
    if (/all paragraphs/i.test(prompt)) fields.push('paragraphs');
    if (/table/i.test(prompt)) fields.push('table');
    if (/title/i.test(prompt)) fields.push('title');
    if (/description/i.test(prompt)) fields.push('description');
  }

  // Map to selectors
  const selectors: Record<string, string> = {};
  for (const field of fields) {
    if (DEFAULT_FIELD_SELECTORS[field]) {
      selectors[field] = DEFAULT_FIELD_SELECTORS[field];
    }
  }
  if (Object.keys(selectors).length === 0) return { url, selectors: null };
  return { url, selectors };
}
