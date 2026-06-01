export interface ScanItem {
  name: string;
  displayName: string;
  description?: string;
  price: number;
  currency: string;
}

export interface ScanCategory {
  name: string;
  displayName: string;
  items: ScanItem[];
}

export interface MenuScanResult {
  categories: ScanCategory[];
}
