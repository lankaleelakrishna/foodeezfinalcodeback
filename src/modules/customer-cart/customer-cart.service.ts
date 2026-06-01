import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CustomerCartEntity } from '../../entities/customer-cart.entity';
import { CustomerCartItemEntity } from '../../entities/customer-cart-item.entity';
import { CustomerCouponEntity, CouponType } from '../../entities/customer-coupon.entity';
import { CustomerCouponUsageEntity } from '../../entities/customer-coupon-usage.entity';
import { MenuItemEntity } from '../../entities/menu-item.entity';
import { MenuPricingRuleType, MenuPricingValueType } from '../../entities/menu-pricing-rule.entity';
import { BranchEntity } from '../../entities/branch.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

const GST_RATE = 0.05;
const BASE_DELIVERY_FEE = 30;
const FREE_DELIVERY_THRESHOLD = 299;
const PACKAGING_FEE_PER_ITEM = 5;
const MAX_PACKAGING_FEE = 50;

@Injectable()
export class CustomerCartService {
  constructor(
    @InjectRepository(CustomerCartEntity)
    private readonly cartRepo: Repository<CustomerCartEntity>,
    @InjectRepository(CustomerCartItemEntity)
    private readonly cartItemRepo: Repository<CustomerCartItemEntity>,
    @InjectRepository(MenuItemEntity)
    private readonly menuItemRepo: Repository<MenuItemEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepo: Repository<BranchEntity>,
    @InjectRepository(CustomerCouponEntity)
    private readonly couponRepo: Repository<CustomerCouponEntity>,
    @InjectRepository(CustomerCouponUsageEntity)
    private readonly couponUsageRepo: Repository<CustomerCouponUsageEntity>,
  ) {}

  async getCart(customerId: string): Promise<CustomerCartEntity | null> {
    return this.cartRepo.findOne({
      where: { customerId },
      relations: ['items'],
    });
  }

  async addItem(customerId: string, dto: AddToCartDto): Promise<CustomerCartEntity> {
    const menuItem = await this.menuItemRepo.findOne({
      where: { id: dto.menuItemId },
      relations: ['branch', 'branch.restaurant', 'pricingRules'],
    });
    if (!menuItem) throw new NotFoundException('Menu item not found');
    if (!menuItem.isVisible || !menuItem.isInStock) {
      throw new BadRequestException('Item is currently unavailable');
    }

    // Use branchId from DTO if provided, otherwise use branch from menu item
    let branch: BranchEntity;
    if (dto.branchId) {
      const foundBranch = await this.branchRepo.findOne({
        where: { id: dto.branchId },
        relations: ['restaurant'],
      });
      if (!foundBranch) throw new NotFoundException('Branch not found');
      branch = foundBranch;
    } else {
      branch = menuItem.branch;
      if (!branch.restaurant) {
        const branchWithRestaurant = await this.branchRepo.findOne({
          where: { id: branch.id },
          relations: ['restaurant'],
        });
        if (!branchWithRestaurant) throw new NotFoundException('Branch not found');
        branch = branchWithRestaurant;
      }
    }

    if (!branch.isOnline || branch.temporaryClosure) {
      throw new BadRequestException(
        `This restaurant is currently not accepting orders. ` +
          `[Branch: ${branch.name}, Online: ${branch.isOnline}, Closure: ${branch.temporaryClosure}]`,
      );
    }

    let cart = await this.cartRepo.findOne({ where: { customerId }, relations: ['items'] });

    if (cart && cart.restaurantId && cart.restaurantId !== branch.restaurant.id) {
      throw new ConflictException({
        message: 'Your cart has items from another restaurant. Clear the cart to add this item.',
        code: 'CART_RESTAURANT_CONFLICT',
        currentRestaurantId: cart.restaurantId,
      });
    }

    if (!cart) {
      cart = this.cartRepo.create({
        customerId,
        restaurantId: branch.restaurant.id,
        branchId: branch.id,
        items: [],
      });
      await this.cartRepo.save(cart);
      cart.items = [];
    }

    const existing = cart.items.find((i) => i.menuItemId === dto.menuItemId);
    const effectiveUnitPrice = this.getEffectiveMenuItemPrice(menuItem);
    if (existing) {
      const maxQty = menuItem.maxOrderQuantity > 0 ? menuItem.maxOrderQuantity : 20;
      const newQty = existing.quantity + dto.quantity;
      if (newQty > maxQty) throw new BadRequestException(`Maximum quantity for this item is ${maxQty}`);

      existing.unitPrice = effectiveUnitPrice;
      existing.quantity = newQty;
      existing.itemTotal = Number(effectiveUnitPrice) * newQty;
      await this.cartItemRepo.save(existing);
    } else {
      const newItem = this.cartItemRepo.create({
        cartId: cart.id,
        menuItemId: dto.menuItemId,
        menuItemName: menuItem.name,
        unitPrice: effectiveUnitPrice,
        quantity: dto.quantity,
        selectedAddons: dto.selectedAddons ?? [],
        itemTotal: Number(effectiveUnitPrice) * dto.quantity,
        specialNote: dto.specialNote,
      });
      await this.cartItemRepo.save(newItem);
      cart.items.push(newItem);
    }

    return this.recalculateAndSave(cart);
  }

  async updateItem(
    customerId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CustomerCartEntity | null> {
    const cart = await this.getCartOrThrow(customerId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');

    if (dto.quantity === 0) {
      await this.cartItemRepo.delete(item.id);
      cart.items = cart.items.filter((i) => i.id !== itemId);
    } else {
      item.quantity = dto.quantity;
      item.itemTotal = Number(item.unitPrice) * dto.quantity;
      await this.cartItemRepo.save(item);
    }

    if (cart.items.length === 0) {
      await this.cartRepo.delete(cart.id);
      return null;
    }

    return this.recalculateAndSave(cart);
  }

  async removeItem(customerId: string, itemId: string): Promise<CustomerCartEntity | null> {
    const cart = await this.getCartOrThrow(customerId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Cart item not found');

    await this.cartItemRepo.delete(itemId);
    cart.items = cart.items.filter((i) => i.id !== itemId);

    if (cart.items.length === 0) {
      await this.cartRepo.delete(cart.id);
      return null;
    }

    return this.recalculateAndSave(cart);
  }

  async clearCart(customerId: string): Promise<{ message: string }> {
    const cart = await this.cartRepo.findOne({ where: { customerId } });
    if (cart) {
      await this.cartItemRepo.delete({ cartId: cart.id });
      await this.cartRepo.delete(cart.id);
    }
    return { message: 'Cart cleared' };
  }

  async applyCoupon(customerId: string, dto: ApplyCouponDto): Promise<CustomerCartEntity> {
    const cart = await this.getCartOrThrow(customerId);

    const coupon = await this.couponRepo.findOne({
      where: { code: dto.couponCode, isActive: true, deletedAt: IsNull() },
    });
    if (!coupon) throw new BadRequestException('Invalid or expired coupon code');

    const now = new Date();
    if (now < coupon.validFrom) throw new BadRequestException('Coupon is not yet active');
    if (now > coupon.validUntil) throw new BadRequestException('Coupon has expired');

    if (Number(cart.subtotal) < Number(coupon.minOrderValue)) {
      throw new BadRequestException(
        `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`,
      );
    }

    if (coupon.restaurantId && coupon.restaurantId !== cart.restaurantId) {
      throw new BadRequestException('This coupon is not valid for this restaurant');
    }

    const usageCount = await this.couponUsageRepo.count({
      where: { customerId, couponId: coupon.id },
    });
    if (usageCount >= coupon.perUserLimit) {
      throw new BadRequestException('You have already used this coupon the maximum number of times');
    }

    cart.appliedCouponCode = coupon.code;
    return this.recalculateAndSave(cart);
  }

  async removeCoupon(customerId: string): Promise<CustomerCartEntity> {
    const cart = await this.getCartOrThrow(customerId);
    cart.appliedCouponCode = undefined;
    return this.recalculateAndSave(cart);
  }

  private async recalculateAndSave(cart: CustomerCartEntity): Promise<CustomerCartEntity> {
    const subtotal = cart.items.reduce((sum, i) => sum + Number(i.itemTotal), 0);
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : BASE_DELIVERY_FEE;
    const packagingFee = Math.min(cart.items.length * PACKAGING_FEE_PER_ITEM, MAX_PACKAGING_FEE);
    const taxAmount = Math.round(subtotal * GST_RATE * 100) / 100;
    const surgeFee = 0;

    let couponDiscount = 0;
    if (cart.appliedCouponCode) {
      const coupon = await this.couponRepo.findOne({
        where: { code: cart.appliedCouponCode, isActive: true, deletedAt: IsNull() },
      });
      if (coupon) {
        couponDiscount = this.computeCouponDiscount(coupon, subtotal, deliveryFee);
      } else {
        cart.appliedCouponCode = undefined;
      }
    }

    cart.subtotal = Math.round(subtotal * 100) / 100;
    cart.deliveryFee = deliveryFee;
    cart.packagingFee = packagingFee;
    cart.taxAmount = taxAmount;
    cart.surgeFee = surgeFee;
    cart.couponDiscount = Math.round(couponDiscount * 100) / 100;
    cart.grandTotal =
      Math.round((subtotal + deliveryFee + packagingFee + taxAmount + surgeFee - couponDiscount) * 100) / 100;

    return this.cartRepo.save(cart);
  }

  private computeCouponDiscount(
    coupon: CustomerCouponEntity,
    subtotal: number,
    deliveryFee: number,
  ): number {
    switch (coupon.type) {
      case CouponType.FLAT:
        return Math.min(Number(coupon.discountValue), subtotal);
      case CouponType.PERCENTAGE: {
        const discount = (subtotal * Number(coupon.discountValue)) / 100;
        return coupon.maxDiscountCap
          ? Math.min(discount, Number(coupon.maxDiscountCap))
          : discount;
      }
      case CouponType.FREE_DELIVERY:
        return deliveryFee;
      default:
        return 0;
    }
  }

  private getEffectiveMenuItemPrice(item: MenuItemEntity): number {
    const now = new Date();
    const activeDiscount = (item.pricingRules ?? []).find((rule) => {
      if (rule.ruleType !== MenuPricingRuleType.Discount || !rule.isActive) {
        return false;
      }
      if (rule.startsAt && rule.startsAt > now) {
        return false;
      }
      if (rule.endsAt && rule.endsAt < now) {
        return false;
      }
      return true;
    });
    if (!activeDiscount) {
      return Number(item.price);
    }
    if (activeDiscount.valueType === MenuPricingValueType.Percentage) {
      return Number(item.price) - (Number(item.price) * Number(activeDiscount.value)) / 100;
    }
    return Number(item.price) - Number(activeDiscount.value);
  }

  private async getCartOrThrow(customerId: string): Promise<CustomerCartEntity> {
    const cart = await this.cartRepo.findOne({
      where: { customerId },
      relations: ['items'],
    });
    if (!cart || !cart.items.length) throw new BadRequestException('Cart is empty');
    return cart;
  }
}
