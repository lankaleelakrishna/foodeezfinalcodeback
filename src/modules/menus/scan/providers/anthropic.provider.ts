import Anthropic from '@anthropic-ai/sdk';
import { IMenuScanProvider } from './interface';
import { MenuScanResult } from '../types';
import { MENU_EXTRACTION_PROMPT } from '../prompt';
import { parseJsonResponse } from '../response-parser';

const VALID_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type AnthropicMime = (typeof VALID_MIME)[number];

export class AnthropicMenuScanProvider implements IMenuScanProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async scan(imageBase64: string, mimeType: string): Promise<MenuScanResult> {
    const media_type: AnthropicMime = VALID_MIME.includes(mimeType as AnthropicMime)
      ? (mimeType as AnthropicMime)
      : 'image/jpeg';

    const message = await this.client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type, data: imageBase64 } },
          { type: 'text', text: MENU_EXTRACTION_PROMPT },
        ],
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    return parseJsonResponse(text);
  }
}
