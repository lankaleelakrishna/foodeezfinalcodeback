import { Body, Controller, Post } from '@nestjs/common';
import { MenuScanService } from './scan/menu-scan.service';
import { MenuScanDto } from './dto/menu-scan.dto';

@Controller()
export class RegistrationScanController {
  constructor(private readonly menuScanService: MenuScanService) {}

  // Public endpoint used by registration UI to preview menu extraction.
  // Returns categories/items in the same shape as MenuBulkUploadDto so frontend
  // can render a preview and later POST the same payload to
  // POST /branches/:branchId/menu-bulk-upload to persist the menu.
  @Post('menu-scan')
  async scanForRegistration(@Body() payload: MenuScanDto) {
    const mime = payload.mimeType || 'image/jpeg';
    const result = await this.menuScanService.scan(payload.imageBase64, mime);

    const categories = Array.isArray(result.categories)
      ? result.categories.map((c: any) => ({
          name: c.name || c.displayName || 'scanned',
          displayName: c.displayName || c.name || 'Scanned',
          items: Array.isArray(c.items)
            ? c.items.map((i: any) => ({
                name: i.name || i.title || 'Item',
                displayName: i.displayName || i.name || i.title || 'Item',
                description: i.description,
                price: typeof i.price === 'number' ? i.price : parseFloat(i.price) || 0,
                currency: i.currency || 'INR',
              }))
            : [],
        }))
      : [];

    return { categories };
  }
}
