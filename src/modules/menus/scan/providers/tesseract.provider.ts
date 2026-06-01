import { createWorker } from 'tesseract.js';
import { IMenuScanProvider } from './interface';
import { MenuScanResult, ScanCategory, ScanItem } from '../types';

export class TesseractMenuScanProvider implements IMenuScanProvider {
  readonly name = 'tesseract';

  async scan(imageBase64: string, mimeType: string): Promise<MenuScanResult> {
    const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;
    const worker = await createWorker('eng', 1, { logger: () => {} });
    try {
      const { data: { text } } = await worker.recognize(dataUrl);
      return this.parseMenuText(text);
    } finally {
      await worker.terminate();
    }
  }

  private parseMenuText(text: string): MenuScanResult {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const categories: ScanCategory[] = [];
    let current: ScanCategory | null = null;

    // Matches: "Item name  99", "Item name ₹99.50", "Item name - 120.00"
    const priceRe = /^(.+?)\s*[-–]?\s*[₹$£€]?\s*(\d{1,5}(?:\.\d{1,2})?)\s*$/;
    // Likely a section header: short, starts with capital, no digits
    const headerRe = /^[A-Z][A-Za-z\s&]{2,40}$/;

    for (const line of lines) {
      const priceMatch = line.match(priceRe);
      if (priceMatch) {
        if (!current) {
          current = { name: 'menu', displayName: 'Menu', items: [] };
          categories.push(current);
        }
        const rawName = priceMatch[1].trim();
        const item: ScanItem = {
          name: rawName,
          displayName: rawName,
          price: parseFloat(priceMatch[2]),
          currency: 'INR',
        };
        current.items.push(item);
      } else if (headerRe.test(line)) {
        const slug = line.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        current = { name: slug, displayName: line, items: [] };
        categories.push(current);
      }
    }

    return { categories: categories.filter((c) => c.items.length > 0) };
  }
}
