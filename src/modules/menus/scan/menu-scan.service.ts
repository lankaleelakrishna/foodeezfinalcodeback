import { Injectable } from '@nestjs/common';
import { createMenuScanProvider } from './menu-scan.factory';
import { IMenuScanProvider } from './providers/interface';
import { MenuScanResult } from './types';

@Injectable()
export class MenuScanService {
  private readonly provider: IMenuScanProvider;

  constructor() {
    this.provider = createMenuScanProvider();
  }

  scan(imageBase64: string, mimeType: string): Promise<MenuScanResult> {
    return this.provider.scan(imageBase64, mimeType);
  }

  get activeProvider(): string {
    return this.provider.name;
  }
}
