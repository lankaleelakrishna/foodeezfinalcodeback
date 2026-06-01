import { BadRequestException } from '@nestjs/common';
import { IMenuScanProvider } from './providers/interface';
import { AnthropicMenuScanProvider } from './providers/anthropic.provider';
import { GeminiMenuScanProvider } from './providers/gemini.provider';
import { OpenAIMenuScanProvider } from './providers/openai.provider';
import { TesseractMenuScanProvider } from './providers/tesseract.provider';

function requireKey(name: string, value: string | undefined): string {
  if (!value || value.startsWith('your-')) {
    throw new BadRequestException(`${name} is not configured in environment variables`);
  }
  return value;
}

export function createMenuScanProvider(): IMenuScanProvider {
  const provider = (process.env.MENU_SCAN_PROVIDER ?? 'gemini').toLowerCase();

  switch (provider) {
    case 'anthropic':
      return new AnthropicMenuScanProvider(requireKey('ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY));
    case 'gemini':
      return new GeminiMenuScanProvider(requireKey('GEMINI_API_KEY', process.env.GEMINI_API_KEY));
    case 'openai':
      return new OpenAIMenuScanProvider(requireKey('OPENAI_API_KEY', process.env.OPENAI_API_KEY));
    case 'tesseract':
      return new TesseractMenuScanProvider();
    default:
      throw new BadRequestException(
        `Unknown MENU_SCAN_PROVIDER "${provider}". Valid options: anthropic | gemini | openai | tesseract`,
      );
  }
}
