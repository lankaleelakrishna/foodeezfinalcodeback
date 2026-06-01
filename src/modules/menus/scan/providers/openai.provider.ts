import OpenAI from 'openai';
import { IMenuScanProvider } from './interface';
import { MenuScanResult } from '../types';
import { MENU_EXTRACTION_PROMPT } from '../prompt';
import { parseJsonResponse } from '../response-parser';

export class OpenAIMenuScanProvider implements IMenuScanProvider {
  readonly name = 'openai';
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async scan(imageBase64: string, mimeType: string): Promise<MenuScanResult> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` } },
          { type: 'text', text: MENU_EXTRACTION_PROMPT },
        ],
      }],
    });
    return parseJsonResponse(response.choices[0]?.message?.content ?? '');
  }
}
