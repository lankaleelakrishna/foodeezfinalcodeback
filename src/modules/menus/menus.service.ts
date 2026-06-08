import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuCategoryEntity } from '../../entities/menu-category.entity';
import { MenuItemEntity } from '../../entities/menu-item.entity';
import { MenuItemChangeRequestEntity, MenuItemChangeRequestStatus } from '../../entities/menu-item-change-request.entity';
import { MenuAddonEntity } from '../../entities/menu-addon.entity';
import { MenuPricingRuleEntity, MenuPricingRuleType } from '../../entities/menu-pricing-rule.entity';
import { BranchEntity } from '../../entities/branch.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { CreateMenuItemChangeRequestDto } from './dto/create-menu-item-change-request.dto';
import { CreateMenuDiscountDto } from './dto/create-menu-discount.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateMenuAddonDto } from './dto/create-menu-addon.dto';
import { UpdateMenuAddonDto } from './dto/update-menu-addon.dto';
import { CreateMenuPricingRuleDto } from './dto/create-menu-pricing-rule.dto';
import { UpdateMenuPricingRuleDto } from './dto/update-menu-pricing-rule.dto';
import { MenuBulkUploadDto } from './dto/menu-bulk-upload.dto';
import { MenuScanService } from './scan/menu-scan.service';
import { UserRole } from '../../entities/user.entity';

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(MenuCategoryEntity)
    private readonly categoryRepository: Repository<MenuCategoryEntity>,
    @InjectRepository(MenuItemEntity)
    private readonly itemRepository: Repository<MenuItemEntity>,
    @InjectRepository(MenuAddonEntity)
    private readonly addonRepository: Repository<MenuAddonEntity>,
    @InjectRepository(MenuPricingRuleEntity)
    private readonly pricingRuleRepository: Repository<MenuPricingRuleEntity>,
    @InjectRepository(MenuItemChangeRequestEntity)
    private readonly changeRequestRepository: Repository<MenuItemChangeRequestEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    private readonly menuScanService: MenuScanService,
  ) {}

  async createCategory(branchId: string, payload: CreateCategoryDto) {
    const branch = await this.branchRepository.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    const category = this.categoryRepository.create({ ...payload, branch });
    return this.categoryRepository.save(category);
  }

  async updateCategory(categoryId: string, payload: UpdateCategoryDto) {
    const category = await this.categoryRepository.findOne({ where: { id: categoryId }, relations: ['branch'] });
    if (!category) {
      throw new NotFoundException('Menu category not found');
    }
    Object.assign(category, payload);
    return this.categoryRepository.save(category);
  }

  async createItem(branchId: string, payload: CreateMenuItemDto) {
    const branch = await this.branchRepository.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    const category = await this.categoryRepository.findOne({ where: { id: payload.categoryId, branch: { id: branchId } } });
    if (!category) {
      throw new NotFoundException('Menu category not found');
    }
    const { discount, ...itemPayload } = payload as CreateMenuItemDto & { discount?: CreateMenuDiscountDto };
    const item = this.itemRepository.create({
      ...itemPayload,
      branch,
      category,
      isVisible: itemPayload.isVisible ?? true,
      isInStock: itemPayload.isInStock ?? true,
      autoOutOfStock: itemPayload.autoOutOfStock ?? true,
      stockOnHand: itemPayload.stockOnHand ?? 0,
      stockThreshold: itemPayload.stockThreshold ?? 0,
      minOrderQuantity: itemPayload.minOrderQuantity ?? 1,
      maxOrderQuantity: itemPayload.maxOrderQuantity ?? 0,
      sortOrder: itemPayload.sortOrder ?? 0,
    });

    const savedItem = await this.itemRepository.save(item);
    if (discount) {
      const discountRule = await this.createItemDiscount(savedItem, discount);
      savedItem.pricingRules = [discountRule];
    }

    return savedItem;
  }

  async findItems(branchId: string) {
    return this.itemRepository.find({ where: { branch: { id: branchId } }, relations: ['category', 'addons', 'pricingRules'] });
  }

  async findCategories(branchId: string) {
    return this.categoryRepository.find({ where: { branch: { id: branchId } }, relations: ['items'] });
  }

  async updateItem(itemId: string, payload: UpdateMenuItemDto) {
    const item = await this.itemRepository.findOne({ where: { id: itemId }, relations: ['branch'] });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    Object.assign(item, payload);
    return this.itemRepository.save(item);
  }

  async uploadItemImage(itemId: string, file: Express.Multer.File) {
    const item = await this.itemRepository.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    const normalizedPath = file.path.replace(/\\/g, '/');
    const uploadsIndex = normalizedPath.indexOf('/uploads/');
    const imageUrl = uploadsIndex >= 0 ? normalizedPath.slice(uploadsIndex) : '/' + normalizedPath.replace(/^\.\//, '');

    item.imageUrl = imageUrl;
    return this.itemRepository.save(item);
  }

  async submitChangeRequest(user: any, itemId: string, payload: CreateMenuItemChangeRequestDto) {
    const item = await this.itemRepository.findOne({
      where: { id: itemId },
      relations: ['branch', 'branch.restaurant'],
    });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    if (user.role !== UserRole.SuperAdmin && (!user.restaurant || user.restaurant.id !== item.branch.restaurant?.id)) {
      throw new ForbiddenException('Not authorized to submit menu changes for this item.');
    }

    const { changeDescription, ...itemPayload } = payload as CreateMenuItemChangeRequestDto & { changeDescription: string };
    if (!changeDescription || !changeDescription.trim()) {
      throw new BadRequestException('Change description is required when submitting a menu change request.');
    }

    if (Object.keys(itemPayload).length === 0) {
      throw new BadRequestException('No menu changes were provided for the request.');
    }

    const request = this.changeRequestRepository.create({
      item,
      branch: item.branch,
      restaurantId: item.branch.restaurant?.id,
      requestedBy: user.id,
      changeDescription,
      payload: itemPayload,
      status: MenuItemChangeRequestStatus.Pending,
    });

    return this.changeRequestRepository.save(request);
  }

  async findPendingChangeRequests() {
    return this.changeRequestRepository.find({
      where: { status: MenuItemChangeRequestStatus.Pending },
      relations: ['item', 'branch'],
    });
  }

  async approveChangeRequest(user: any, requestId: string, payload: { reviewComment?: string }) {
    const request = await this.changeRequestRepository.findOne({
      where: { id: requestId },
      relations: ['item'],
    });
    if (!request) {
      throw new NotFoundException('Menu change request not found');
    }
    if (request.status !== MenuItemChangeRequestStatus.Pending) {
      throw new BadRequestException('Only pending requests can be approved.');
    }

    Object.assign(request.item, request.payload);
    await this.itemRepository.save(request.item);

    request.status = MenuItemChangeRequestStatus.Approved;
    request.reviewComment = payload.reviewComment;
    request.reviewedBy = user.id;
    request.reviewedAt = new Date();
    return this.changeRequestRepository.save(request);
  }

  async rejectChangeRequest(user: any, requestId: string, payload: { reviewComment?: string }) {
    const request = await this.changeRequestRepository.findOne({
      where: { id: requestId },
      relations: ['item'],
    });
    if (!request) {
      throw new NotFoundException('Menu change request not found');
    }
    if (request.status !== MenuItemChangeRequestStatus.Pending) {
      throw new BadRequestException('Only pending requests can be rejected.');
    }

    request.status = MenuItemChangeRequestStatus.Rejected;
    request.reviewComment = payload.reviewComment;
    request.reviewedBy = user.id;
    request.reviewedAt = new Date();
    return this.changeRequestRepository.save(request);
  }

  async createAddon(itemId: string, payload: CreateMenuAddonDto) {
    const item = await this.itemRepository.findOne({ where: { id: itemId }, relations: ['branch'] });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    const addon = this.addonRepository.create({ ...payload, item, branch: item.branch });
    return this.addonRepository.save(addon);
  }

  async updateAddon(addonId: string, payload: UpdateMenuAddonDto) {
    const addon = await this.addonRepository.findOne({ where: { id: addonId } });
    if (!addon) {
      throw new NotFoundException('Menu addon not found');
    }
    Object.assign(addon, payload);
    return this.addonRepository.save(addon);
  }

  async findAddons(itemId: string) {
    return this.addonRepository.find({ where: { item: { id: itemId } } });
  }

  async createPricingRule(itemId: string, payload: CreateMenuPricingRuleDto) {
    const item = await this.itemRepository.findOne({ where: { id: itemId }, relations: ['branch'] });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    const pricingRule = this.pricingRuleRepository.create({
      ...payload,
      item,
      branch: item.branch,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : undefined,
      endsAt: payload.endsAt ? new Date(payload.endsAt) : undefined,
    });
    return this.pricingRuleRepository.save(pricingRule);
  }

  async createDiscount(itemId: string, payload: CreateMenuDiscountDto) {
    const item = await this.itemRepository.findOne({ where: { id: itemId }, relations: ['branch'] });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    return this.createItemDiscount(item, payload);
  }

  private async createItemDiscount(item: MenuItemEntity, payload: CreateMenuDiscountDto) {
    const pricingRule = this.pricingRuleRepository.create({
      item,
      branch: item.branch,
      ruleType: MenuPricingRuleType.Discount,
      valueType: payload.valueType,
      value: payload.value,
      title: payload.title,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : undefined,
      endsAt: payload.endsAt ? new Date(payload.endsAt) : undefined,
      conditions: payload.conditions,
    });
    return this.pricingRuleRepository.save(pricingRule);
  }

  async updatePricingRule(ruleId: string, payload: UpdateMenuPricingRuleDto) {
    const pricingRule = await this.pricingRuleRepository.findOne({ where: { id: ruleId } });
    if (!pricingRule) {
      throw new NotFoundException('Pricing rule not found');
    }
    Object.assign(pricingRule, payload);
    return this.pricingRuleRepository.save(pricingRule);
  }

  async findPricingRules(itemId: string) {
    return this.pricingRuleRepository.find({ where: { item: { id: itemId } } });
  }

  scanMenu(imageBase64: string, mimeType = 'image/jpeg') {
    return this.menuScanService.scan(imageBase64, mimeType);
  }

  async bulkUpload(branchId: string, payload: MenuBulkUploadDto) {
    const branch = await this.branchRepository.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const categories = payload.categories.map((categoryPayload) => {
      const category = this.categoryRepository.create({
        name: categoryPayload.name,
        displayName: categoryPayload.displayName,
        branch,
      });
      return category;
    });

    const savedCategories = await this.categoryRepository.save(categories);

    const items = [] as MenuItemEntity[];
    const itemDiscounts: Array<{ item: MenuItemEntity; discount: CreateMenuDiscountDto }> = [];

    for (const [index, categoryPayload] of payload.categories.entries()) {
      const category = savedCategories[index];
      for (const itemPayload of categoryPayload.items) {
        const { discount, ...itemData } = itemPayload as typeof itemPayload & { discount?: CreateMenuDiscountDto };
        const item = this.itemRepository.create({
          ...itemData,
          branch,
          category,
          isVisible: itemData.isVisible ?? true,
          isInStock: itemData.isInStock ?? true,
        });
        items.push(item);
        if (discount) {
          itemDiscounts.push({ item, discount });
        }
      }
    }

    const savedItems = await this.itemRepository.save(items);
    const pricingRules = [];
    for (const itemDiscount of itemDiscounts) {
      pricingRules.push(
        this.pricingRuleRepository.create({
          item: itemDiscount.item,
          branch,
          ruleType: MenuPricingRuleType.Discount,
          valueType: itemDiscount.discount.valueType,
          value: itemDiscount.discount.value,
          title: itemDiscount.discount.title,
          startsAt: itemDiscount.discount.startsAt ? new Date(itemDiscount.discount.startsAt) : undefined,
          endsAt: itemDiscount.discount.endsAt ? new Date(itemDiscount.discount.endsAt) : undefined,
          conditions: itemDiscount.discount.conditions,
        }),
      );
    }
    if (pricingRules.length) {
      await this.pricingRuleRepository.save(pricingRules);
    }

    return savedItems;
  }
}