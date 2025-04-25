import { chromium } from 'playwright';

/**
 * Extracts structured data from a web page using provided CSS selectors.
 * @param url The URL of the page to extract from
 * @param selectors An object mapping keys to CSS selectors
 * @returns An object with extracted data
 */
export async function extractData(url: string, selectors: Record<string, string>) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const result: Record<string, any> = {};
    for (const [key, selector] of Object.entries(selectors)) {
      // Special handling for arrays (e.g., links)
      if (selector.endsWith('[]')) {
        const cssSelector = selector.slice(0, -2);
        result[key] = await page.$$eval(cssSelector, els => els.map(e => (e as HTMLAnchorElement).href || e.textContent?.trim() || ''));
      } else {
        // Single element: try textContent, fallback to value/attribute
        result[key] = await page.$eval(selector, el => {
          if ((el as HTMLInputElement).value) return (el as HTMLInputElement).value;
          if (el.textContent) return el.textContent.trim();
          return '';
        }).catch(() => null);
      }
    }
    await browser.close();
    return result;
  } catch (err: any) {
    await browser.close();
    throw new Error('Extraction failed: ' + err.message);
  }
}
