/**
 * Response after menu extraction
 */
export class MenuExtractionResponseDto {
  restaurantId: string;
  extractedMenuItems: ExtractedMenuItem[];
  rawExtraction: any;
}

export interface ExtractedMenuItem {
  categoryName: string;
  itemName: string;
  price?: number;
  description?: string;
  image?: string;
}
