import { GoogleGenerativeAI } from '@google/generative-ai';
import { IMenuScanProvider } from './interface';
import { MenuScanResult } from '../types';
import { MENU_EXTRACTION_PROMPT } from '../prompt';
import { parseJsonResponse } from '../response-parser';

export class GeminiMenuScanProvider implements IMenuScanProvider {
  readonly name = 'gemini';
  private readonly genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async scan(imageBase64: string, mimeType: string): Promise<MenuScanResult> {
    const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { maxOutputTokens: 65536, temperature: 0, responseMimeType: 'application/json' },
    });
    const result = await model.generateContent([
      { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } },
      MENU_EXTRACTION_PROMPT,
    ]);
    const raw = result.response.text();
    return parseJsonResponse(raw);
  }
}
