import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MenusService } from './menus.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateMenuAddonDto } from './dto/create-menu-addon.dto';
import { UpdateMenuAddonDto } from './dto/update-menu-addon.dto';
import { CreateMenuPricingRuleDto } from './dto/create-menu-pricing-rule.dto';
import { CreateMenuDiscountDto } from './dto/create-menu-discount.dto';
import { UpdateMenuPricingRuleDto } from './dto/update-menu-pricing-rule.dto';
import { MenuBulkUploadDto } from './dto/menu-bulk-upload.dto';
import { MenuScanDto } from './dto/menu-scan.dto';
import { CreateMenuItemChangeRequestDto } from './dto/create-menu-item-change-request.dto';
import { ReviewMenuItemChangeRequestDto } from './dto/review-menu-item-change-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Post('branches/:branchId/menu-categories')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  createCategory(@Param('branchId') branchId: string, @Body() payload: CreateCategoryDto) {
    return this.menusService.createCategory(branchId, payload);
  }

  @Patch('menu-categories/:categoryId')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  updateCategory(@Param('categoryId') categoryId: string, @Body() payload: UpdateCategoryDto) {
    return this.menusService.updateCategory(categoryId, payload);
  }

  @Post('branches/:branchId/menu-items')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  createItem(@Param('branchId') branchId: string, @Body() payload: CreateMenuItemDto) {
    return this.menusService.createItem(branchId, payload);
  }

  @Patch('menu-items/:itemId')
  @Roles(UserRole.SuperAdmin)
  updateItem(@Param('itemId') itemId: string, @Body() payload: UpdateMenuItemDto) {
    return this.menusService.updateItem(itemId, payload);
  }

  @Post('menu-items/:itemId/change-requests')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  submitChangeRequest(
    @CurrentUser() user: any,
    @Param('itemId') itemId: string,
    @Body() payload: CreateMenuItemChangeRequestDto,
  ) {
    return this.menusService.submitChangeRequest(user, itemId, payload);
  }

  @Get('menu-item-change-requests')
  @Roles(UserRole.SuperAdmin)
  findPendingChangeRequests() {
    return this.menusService.findPendingChangeRequests();
  }

  @Post('menu-item-change-requests/:requestId/approve')
  @Roles(UserRole.SuperAdmin)
  approveChangeRequest(
    @CurrentUser() user: any,
    @Param('requestId') requestId: string,
    @Body() payload: ReviewMenuItemChangeRequestDto,
  ) {
    return this.menusService.approveChangeRequest(user, requestId, payload);
  }

  @Post('menu-item-change-requests/:requestId/reject')
  @Roles(UserRole.SuperAdmin)
  rejectChangeRequest(
    @CurrentUser() user: any,
    @Param('requestId') requestId: string,
    @Body() payload: ReviewMenuItemChangeRequestDto,
  ) {
    return this.menusService.rejectChangeRequest(user, requestId, payload);
  }

  @Post('menu-items/:itemId/addons')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  createAddon(@Param('itemId') itemId: string, @Body() payload: CreateMenuAddonDto) {
    return this.menusService.createAddon(itemId, payload);
  }

  @Patch('menu-addons/:addonId')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  updateAddon(@Param('addonId') addonId: string, @Body() payload: UpdateMenuAddonDto) {
    return this.menusService.updateAddon(addonId, payload);
  }

  @Get('menu-items/:itemId/addons')
  findAddons(@Param('itemId') itemId: string) {
    return this.menusService.findAddons(itemId);
  }

  @Post('menu-items/:itemId/pricing-rules')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  createPricingRule(@Param('itemId') itemId: string, @Body() payload: CreateMenuPricingRuleDto) {
    return this.menusService.createPricingRule(itemId, payload);
  }

  @Post('menu-items/:itemId/discounts')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  createItemDiscount(@Param('itemId') itemId: string, @Body() payload: CreateMenuDiscountDto) {
    return this.menusService.createDiscount(itemId, payload);
  }

  @Patch('menu-pricing-rules/:ruleId')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  updatePricingRule(@Param('ruleId') ruleId: string, @Body() payload: UpdateMenuPricingRuleDto) {
    return this.menusService.updatePricingRule(ruleId, payload);
  }

  @Get('menu-items/:itemId/pricing-rules')
  findPricingRules(@Param('itemId') itemId: string) {
    return this.menusService.findPricingRules(itemId);
  }

  @Post('branches/:branchId/menu-bulk-upload')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  bulkUpload(@Param('branchId') branchId: string, @Body() payload: MenuBulkUploadDto) {
    return this.menusService.bulkUpload(branchId, payload);
  }

  @Post('branches/:branchId/menu-scan')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  scanMenu(@Param('branchId') branchId: string, @Body() payload: MenuScanDto) {
    return this.menusService.scanMenu(payload.imageBase64, payload.mimeType);
  }

  @Get('branches/:branchId/menu-categories')
  findCategories(@Param('branchId') branchId: string) {
    return this.menusService.findCategories(branchId);
  }

  @Get('branches/:branchId/menu-items')
  findItems(@Param('branchId') branchId: string) {
    return this.menusService.findItems(branchId);
  }
}
