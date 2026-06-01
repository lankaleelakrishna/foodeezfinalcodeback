import { MenuScanResult } from '../types';

export interface IMenuScanProvider {
  readonly name: string;
  scan(imageBase64: string, mimeType: string): Promise<MenuScanResult>;
}
