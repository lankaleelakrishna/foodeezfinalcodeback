import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LeadStatus, RestaurantEntity } from '../../entities/restaurant.entity';
import { UserEntity, UserRole } from '../../entities/user.entity';
import { DocumentEntity, DocumentType } from '../../entities/document.entity';
import { CustomerEntity } from '../../entities/customer.entity';
import { DeliveryPartnerEntity } from '../../entities/delivery-partner.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { CreateRestaurantUserDto } from './dto/create-restaurant-user.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { RegisterStep1Dto } from './dto/register-step1.dto';
import { RegisterStep2Dto } from './dto/register-step2.dto';
import { RegisterStep3Dto } from './dto/register-step3.dto';
import { MenuScanService } from '../menus/scan/menu-scan.service';

@Injectable()
export class RestaurantsService {
  private readonly logger = new Logger(RestaurantsService.name);
  constructor(
    @InjectRepository(RestaurantEntity)
    private readonly restaurantRepository: Repository<RestaurantEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,

    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,

    @InjectRepository(DeliveryPartnerEntity)
    private readonly deliveryPartnerRepository: Repository<DeliveryPartnerEntity>,

    private readonly notificationsService: NotificationsService,
    private readonly menuScanService: MenuScanService,
  ) {}

  async create(payload: CreateRestaurantDto) {
    // normalize inputs for duplicate detection
    const normalizedEmail = payload.email?.trim().toLowerCase() ?? '';
    const normalizedPhone = payload.phone ? payload.phone.replace(/\D/g, '') : '';
    const normalizedName = payload.name?.trim().toLowerCase() ?? '';
    const normalizedAddress = payload.address?.trim().toLowerCase() ?? '';

    // check duplicates individually to provide clearer errors
    if (normalizedEmail) {
      const byEmail = await this.restaurantRepository
        .createQueryBuilder('r')
        .where('lower(r.email) = :email', { email: normalizedEmail })
        .getOne();
      if (byEmail) {
        this.logger.warn(`Duplicate restaurant email detected: ${normalizedEmail}`);
        throw new BadRequestException('A restaurant with the same email already exists.');
      }
    }

    if (normalizedPhone) {
      const byPhone = await this.restaurantRepository
        .createQueryBuilder('r')
        .where("regexp_replace(r.phone, '\\\\D', '', 'g') = :phone", { phone: normalizedPhone })
        .getOne();
      if (byPhone) {
        this.logger.warn(`Duplicate restaurant phone detected: ${normalizedPhone}`);
        throw new BadRequestException('A restaurant with the same phone number already exists.');
      }

      // check customers
      const byCustomer = await this.customerRepository
        .createQueryBuilder('c')
        .where("regexp_replace(c.phone, '\\\\D', '', 'g') = :phone", { phone: normalizedPhone })
        .getOne();
      if (byCustomer) {
        this.logger.warn(`Phone number already used by customer: ${normalizedPhone}`);
        throw new BadRequestException('This phone number is already associated with an existing customer.');
      }

      // check delivery partners
      const byPartner = await this.deliveryPartnerRepository
        .createQueryBuilder('d')
        .where("regexp_replace(d.phone, '\\\\D', '', 'g') = :phone", { phone: normalizedPhone })
        .getOne();
      if (byPartner) {
        this.logger.warn(`Phone number already used by delivery partner: ${normalizedPhone}`);
        throw new BadRequestException('This phone number is already associated with an existing delivery partner.');
      }
    }

    if (normalizedName && normalizedAddress) {
      const byNameAddress = await this.restaurantRepository
        .createQueryBuilder('r')
        .where('lower(r.name) = :name AND lower(r.address) = :address', {
          name: normalizedName,
          address: normalizedAddress,
        })
        .getOne();
      if (byNameAddress) {
        this.logger.warn(`Duplicate restaurant name+address detected: ${normalizedName} / ${normalizedAddress}`);
        throw new BadRequestException('A restaurant with the same name and address already exists.');
      }
    }

    // update payload to normalized values for storage/processing where appropriate
    payload.email = normalizedEmail || payload.email;
    if (normalizedPhone) payload.phone = normalizedPhone;

    const suspicious = this.detectPotentialFraud(payload);

    const restaurant = this.restaurantRepository.create({
      name: payload.name,
      ownerName: payload.ownerName,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      zipCode: payload.zipCode,
      latitude: payload.latitude,
      longitude: payload.longitude,
      gstNumber: payload.gstNumber,
      fssaiNumber: payload.fssaiNumber,
      bankName: payload.bankName,
      bankAccountNumber: payload.bankAccountNumber,
      ifscCode: payload.ifscCode,
      leadStatus: suspicious ? LeadStatus.Review : LeadStatus.Registered,
      leadSource: payload.leadSource,
      riskScore: this.calculateRiskScore(payload, suspicious),
      agreementSigned: false,
      agreementMethod: undefined,
      storePhotos: payload.storePhotos,
      brandDescription: payload.brandDescription,
      cuisineTags: payload.cuisineTags,
      serviceRadiusKm: payload.serviceRadiusKm,
      deliveryZones: payload.deliveryZones
        ? JSON.parse(JSON.stringify(payload.deliveryZones))
        : undefined,
      temporaryClosure: payload.temporaryClosure ?? false,
      holidayMode: payload.holidayMode ?? false,
      gstExpiryDate: payload.gstExpiryDate,
      fssaiExpiryDate: payload.fssaiExpiryDate,
      status: suspicious ? 'review' : payload.status || 'pending',
      onboardingStep: 2,
    });

    if ((payload as any).menuExtractedJson) {
      try {
        const parsed = JSON.parse((payload as any).menuExtractedJson);
        restaurant.extractedMenu = Array.isArray(parsed) ? { categories: parsed } : parsed;
      } catch {}
    }

    const savedRestaurant = await this.restaurantRepository.save(restaurant);

    // generate temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    // create restaurant admin user
    const user = this.userRepository.create({
      displayName: payload.ownerName,
      email: payload.email,
      passwordHash,
      role: UserRole.RestaurantAdmin,
      restaurant: savedRestaurant,
      mustChangePassword: true,
    });

    await this.userRepository.save(user);
    await this.userRepository.save(user);

    return savedRestaurant;
  }

  private detectPotentialFraud(payload: CreateRestaurantDto) {
    const freeDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];

    const emailDomain = payload.email.split('@').pop()?.toLowerCase() ?? '';

    const highRisk = freeDomains.includes(emailDomain);

    const missingGeo = !payload.latitude || !payload.longitude;

    return highRisk || missingGeo;
  }

  async createRestaurantUser(
    restaurantId: string,
    payload: CreateRestaurantUserDto,
  ) {
    const restaurant = await this.findOne(restaurantId);

    const existingUser = await this.userRepository.findOne({
      where: { email: payload.email },
    });

    if (existingUser) {
      throw new BadRequestException('A user with this email already exists.');
    }

    const temporaryPassword =
      payload.password || this.generateTemporaryPassword();

    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user = this.userRepository.create({
      displayName: payload.displayName,
      email: payload.email,
      passwordHash,
      role: payload.role,
      restaurant,
      mustChangePassword: true,
    });

    const savedUser = await this.userRepository.save(user);

    // send credentials email
    await this.notificationsService.sendRestaurantCredentials({
      email: savedUser.email ?? '',
      phone: restaurant.phone ?? '',
      password: temporaryPassword,
      restaurantName: restaurant.name ?? '',
    });

    return {
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      displayName: savedUser.displayName,
      restaurantId: restaurant.id,
    };
  }

  async findUsersByRestaurant(restaurantId: string) {
    const restaurant = await this.findOne(restaurantId);

    return this.userRepository.find({
      where: { restaurant: { id: restaurant.id } },
      select: [
        'id',
        'email',
        'role',
        'displayName',
        'isActive',
        'createdAt',
      ],
    });
  }

  async findAll(activeOnly = false, includeId?: string) {
    if (!activeOnly) {
      return this.restaurantRepository.find({
        order: { createdAt: 'DESC' },
      });
    }

    const where = includeId
      ? [{ status: 'active' }, { id: includeId }]
      : [{ status: 'active' }];

    return this.restaurantRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async update(id: string, payload: UpdateRestaurantDto) {
    const restaurant = await this.findOne(id);

    Object.assign(restaurant, payload);

    return this.restaurantRepository.save(restaurant);
  }

  async getOnboardingStatus(id: string) {
    const restaurant = await this.findOne(id);

    return {
      id: restaurant.id,
      status: restaurant.status,
      onboardingStep: restaurant.onboardingStep,
      name: restaurant.name,
      email: restaurant.email,
      phone: restaurant.phone,
      address: restaurant.address,
      city: restaurant.city,
      state: restaurant.state,
      zipCode: restaurant.zipCode,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      gstNumber: restaurant.gstNumber,
      gstExpiryDate: restaurant.gstExpiryDate,
      fssaiNumber: restaurant.fssaiNumber,
      fssaiExpiryDate: restaurant.fssaiExpiryDate,
      bankName: restaurant.bankName,
      bankAccountNumber: restaurant.bankAccountNumber,
      ifscCode: restaurant.ifscCode,
      temporaryClosure: restaurant.temporaryClosure,
      holidayMode: restaurant.holidayMode,
      brandDescription: restaurant.brandDescription,
      cuisineTags: restaurant.cuisineTags,
      serviceRadiusKm: restaurant.serviceRadiusKm,
    };
  }

  async advanceOnboardingStep(id: string, step: number) {
    const restaurant = await this.findOne(id);

    restaurant.onboardingStep = Math.max(restaurant.onboardingStep, step);

    if (restaurant.onboardingStep >= 5) {
      restaurant.status = 'active';
    }

    return this.restaurantRepository.save(restaurant);
  }

  /**
   * Step 1: Register restaurant with basic details and location
   */
  async registerStep1(payload: RegisterStep1Dto) {
    // normalize inputs for duplicate detection
    const normalizedEmail = payload.email?.trim().toLowerCase() ?? '';
    const normalizedPhone = payload.phone ? payload.phone.replace(/\D/g, '') : '';
    const normalizedName = payload.name?.trim().toLowerCase() ?? '';
    const normalizedAddress = payload.address?.trim().toLowerCase() ?? '';

    if (normalizedEmail) {
      const byEmail = await this.restaurantRepository
        .createQueryBuilder('r')
        .where('lower(r.email) = :email', { email: normalizedEmail })
        .getOne();
      if (byEmail) {
        this.logger.warn(`Duplicate restaurant email detected (registerStep1): ${normalizedEmail}`);
        throw new BadRequestException('A restaurant with the same email already exists.');
      }
    }

    if (normalizedPhone) {
      const byPhone = await this.restaurantRepository
        .createQueryBuilder('r')
        .where("regexp_replace(r.phone, '\\\\D', '', 'g') = :phone", { phone: normalizedPhone })
        .getOne();
      if (byPhone) {
        this.logger.warn(`Duplicate restaurant phone detected (registerStep1): ${normalizedPhone}`);
        throw new BadRequestException('A restaurant with the same phone number already exists.');
      }

      // check customers
      const byCustomer = await this.customerRepository
        .createQueryBuilder('c')
        .where("regexp_replace(c.phone, '\\\\D', '', 'g') = :phone", { phone: normalizedPhone })
        .getOne();
      if (byCustomer) {
        this.logger.warn(`Phone number already used by customer (registerStep1): ${normalizedPhone}`);
        throw new BadRequestException('This phone number is already associated with an existing customer.');
      }

      // check delivery partners
      const byPartner = await this.deliveryPartnerRepository
        .createQueryBuilder('d')
        .where("regexp_replace(d.phone, '\\\\D', '', 'g') = :phone", { phone: normalizedPhone })
        .getOne();
      if (byPartner) {
        this.logger.warn(`Phone number already used by delivery partner (registerStep1): ${normalizedPhone}`);
        throw new BadRequestException('This phone number is already associated with an existing delivery partner.');
      }
    }

    if (normalizedName && normalizedAddress) {
      const byNameAddress = await this.restaurantRepository
        .createQueryBuilder('r')
        .where('lower(r.name) = :name AND lower(r.address) = :address', {
          name: normalizedName,
          address: normalizedAddress,
        })
        .getOne();
      if (byNameAddress) {
        this.logger.warn(`Duplicate restaurant name+address detected (registerStep1): ${normalizedName} / ${normalizedAddress}`);
        throw new BadRequestException('A restaurant with the same name and address already exists.');
      }
    }

    // update payload to normalized values for storage/processing where appropriate
    payload.email = normalizedEmail || payload.email;
    if (normalizedPhone) payload.phone = normalizedPhone;

    const suspicious = this.detectPotentialFraud(payload as any);

    const restaurant = this.restaurantRepository.create({
      name: payload.name,
      ownerName: payload.ownerName,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      zipCode: payload.zipCode,
      latitude: payload.latitude,
      longitude: payload.longitude,
      legalEntity: payload.legalEntity,
      leadStatus: suspicious ? LeadStatus.Review : LeadStatus.Registered,
      leadSource: payload.leadSource,
      riskScore: this.calculateRiskScore(payload as any, suspicious),
      status: suspicious ? 'review' : 'pending',
      onboardingStep: 1,
    });

    const savedRestaurant = await this.restaurantRepository.save(restaurant);

    // Generate temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    // Create restaurant admin user
    const user = this.userRepository.create({
      displayName: payload.ownerName,
      email: payload.email,
      passwordHash,
      role: UserRole.RestaurantAdmin,
      restaurant: savedRestaurant,
      mustChangePassword: true,
    });

    await this.userRepository.save(user);

    // Send credentials email
    await this.notificationsService.sendRestaurantCredentials({
      email: payload.email ?? '',
      phone: payload.phone ?? '',
      password: temporaryPassword,
      restaurantName: payload.name ?? '',
    });

    return {
      id: savedRestaurant.id,
      onboardingStep: savedRestaurant.onboardingStep,
      message: 'Step 1 completed. Please proceed to Step 2.',
    };
  }

  /**
   * Step 2: Add compliance, banking and business details with documents
   */
  async registerStep2(restaurantId: string, payload: RegisterStep2Dto) {
    const restaurant = await this.findOne(restaurantId);
    // Validate bank account confirmation when provided
    if ((payload as any).bankAccountNumberConfirm && payload.bankAccountNumber && (payload as any).bankAccountNumberConfirm !== payload.bankAccountNumber) {
      throw new BadRequestException('Bank account numbers do not match.');
    }

    // Update restaurant with compliance details
    restaurant.gstNumber = payload.gstNumber;
    restaurant.gstExpiryDate = payload.gstExpiryDate ? new Date(payload.gstExpiryDate) : undefined;
    restaurant.fssaiNumber = payload.fssaiNumber;
    restaurant.fssaiExpiryDate = payload.fssaiExpiryDate ? new Date(payload.fssaiExpiryDate) : undefined;
    restaurant.bankName = payload.bankName;
    restaurant.bankAccountNumber = payload.bankAccountNumber;
    restaurant.bankAccountHolderName = (payload as any).bankAccountHolderName;
    restaurant.accountType = (payload as any).accountType;
    restaurant.panNumber = (payload as any).panNumber;
    // frontPhotoKey will be stored on restaurant.frontPhoto and also appended to storePhotos
    if ((payload as any).frontPhotoKey) {
      restaurant.frontPhoto = (payload as any).frontPhotoKey;
      if (!restaurant.storePhotos) restaurant.storePhotos = [];
      if (!restaurant.storePhotos.includes((payload as any).frontPhotoKey)) {
        restaurant.storePhotos = [...restaurant.storePhotos, (payload as any).frontPhotoKey];
      }
    }
    restaurant.ifscCode = payload.ifscCode;
    restaurant.onboardingStep = 2;

    const updatedRestaurant = await this.restaurantRepository.save(restaurant);

    // Save uploaded documents - they will be directly accessible to super admin
    const documents = [];

    if (payload.gstDocumentKey) {
      const gstDoc = this.documentRepository.create({
        restaurant: updatedRestaurant,
        restaurantId: updatedRestaurant.id,
        type: DocumentType.GST,
        s3Key: payload.gstDocumentKey,
        filename: `GST_${restaurantId}_${Date.now()}.pdf`,
        status: 'uploaded',
      });
      const saved = await this.documentRepository.save(gstDoc);
      this.logger.log(`GST document saved for restaurant ${restaurantId}: ${saved.id}`);
      documents.push(saved);
    }

    if (payload.fssaiDocumentKey) {
      const fssaiDoc = this.documentRepository.create({
        restaurant: updatedRestaurant,
        restaurantId: updatedRestaurant.id,
        type: DocumentType.FSSAI,
        s3Key: payload.fssaiDocumentKey,
        filename: `FSSAI_${restaurantId}_${Date.now()}.pdf`,
        status: 'uploaded',
      });
      const saved = await this.documentRepository.save(fssaiDoc);
      this.logger.log(`FSSAI document saved for restaurant ${restaurantId}: ${saved.id}`);
      documents.push(saved);
    }

    if (payload.bankDocumentKey) {
      const bankDoc = this.documentRepository.create({
        restaurant: updatedRestaurant,
        restaurantId: updatedRestaurant.id,
        type: DocumentType.BANK,
        s3Key: payload.bankDocumentKey,
        filename: `BANK_${restaurantId}_${Date.now()}.pdf`,
        status: 'uploaded',
      });
      const saved = await this.documentRepository.save(bankDoc);
      this.logger.log(`BANK document saved for restaurant ${restaurantId}: ${saved.id}`);
      documents.push(saved);
    }

    if ((payload as any).panDocumentKey) {
      const panDoc = this.documentRepository.create({
        restaurant: updatedRestaurant,
        restaurantId: updatedRestaurant.id,
        type: DocumentType.PAN,
        s3Key: (payload as any).panDocumentKey,
        filename: `PAN_${restaurantId}_${Date.now()}.pdf`,
        status: 'uploaded',
      });
      const saved = await this.documentRepository.save(panDoc);
      this.logger.log(`PAN document saved for restaurant ${restaurantId}: ${saved.id}`);
      documents.push(saved);
    }

    this.logger.log(`Total documents saved for restaurant ${restaurantId}: ${documents.length}`);

    return {
      id: updatedRestaurant.id,
      onboardingStep: updatedRestaurant.onboardingStep,
      uploadedDocuments: documents.map(doc => ({
        id: doc.id,
        type: doc.type,
        filename: doc.filename,
        uploadedAt: doc.uploadedAt,
      })),
      message: 'Step 2 completed with documents uploaded. Super admin can now access these documents.',
    };
  }

  /**
   * Step 3: Upload menu image and extract menu items
   */
  async extractMenuForRegistration(restaurantId: string, payload: RegisterStep3Dto) {
    await this.findOne(restaurantId);

    let extractedMenu: any = {};
    try {
      const mimeType = payload.menuImageBase64.includes('data:')
        ? payload.menuImageBase64.split(';')[0].replace('data:', '')
        : 'image/jpeg';

      const base64Data = payload.menuImageBase64.includes('base64,')
        ? payload.menuImageBase64.split('base64,')[1]
        : payload.menuImageBase64;

      extractedMenu = await this.menuScanService.scan(base64Data, mimeType);
    } catch (error) {
      console.error('Menu extraction preview error:', error);
      extractedMenu = { categories: [] };
    }

    const extractedMenuItems = Array.isArray(extractedMenu.categories)
      ? extractedMenu.categories.flatMap((category: any) =>
          Array.isArray(category.items)
            ? category.items.map((item: any) => ({
                categoryName: category.displayName || category.name || 'Menu',
                itemName: item.name || item.title || 'Item',
                price: item.price,
                description: item.description,
                image: item.image,
              }))
            : [],
        )
      : [];

    const categories = Array.isArray(extractedMenu.categories)
      ? extractedMenu.categories.map((c: any) => ({
          name: c.name || c.displayName || 'scanned',
          displayName: c.displayName || c.name || 'Scanned',
          items: Array.isArray(c.items)
            ? c.items.map((i: any) => ({
                name: i.name || i.title || 'Item',
                description: i.description,
                price: typeof i.price === 'number' ? i.price : parseFloat(i.price) || 0,
                currency: i.currency || 'INR',
              }))
            : [],
        }))
      : [];

    return {
      restaurantId,
      extractedMenuItems,
      categories,
      rawExtraction: extractedMenu,
    };
  }

  async registerStep3(restaurantId: string, payload: RegisterStep3Dto) {
    const restaurant = await this.findOne(restaurantId);

    // Extract menu from image using AI
    let extractedMenu: any = {};
    try {
      // Convert base64 to mime type
      const mimeType = payload.menuImageBase64.includes('data:')
        ? payload.menuImageBase64.split(';')[0].replace('data:', '')
        : 'image/jpeg';

      // Remove data URI prefix if present
      const base64Data = payload.menuImageBase64.includes('base64,')
        ? payload.menuImageBase64.split('base64,')[1]
        : payload.menuImageBase64;

      extractedMenu = await this.menuScanService.scan(base64Data, mimeType);
    } catch (error) {
      console.error('Menu extraction error:', error);
      // Continue even if extraction fails - admin can add menu manually
      extractedMenu = { categories: [] };
    }

    // Update restaurant with additional details
    restaurant.brandDescription = payload.brandDescription;
    restaurant.cuisineTags = payload.cuisineTags;
    restaurant.serviceRadiusKm = payload.serviceRadiusKm;
    restaurant.storePhotos = payload.storePhotos;
    restaurant.temporaryClosure = payload.temporaryClosure ?? false;
    restaurant.holidayMode = payload.holidayMode ?? false;
    if (payload.coverPhotoKey) {
      restaurant.coverPhoto = payload.coverPhotoKey;
    }
    restaurant.extractedMenu = extractedMenu;
    restaurant.onboardingStep = 3;
    restaurant.status = 'active'; // Mark as active after step 3

    const updatedRestaurant = await this.restaurantRepository.save(restaurant);

    return {
      id: updatedRestaurant.id,
      onboardingStep: updatedRestaurant.onboardingStep,
      extractedMenu,
      message: 'Step 3 completed. Menu extracted and available for admin review and editing.',
    };
  }

  /**
   * Get extracted menu for restaurant - accessible to restaurant admin and super admin
   */
  async getExtractedMenuByRestaurant(restaurantId: string) {
    const restaurant = await this.findOne(restaurantId);

    const rawExtraction = restaurant.extractedMenu || { categories: [] };
    const extractedMenuItems = Array.isArray(rawExtraction.categories)
      ? rawExtraction.categories.flatMap((category: any) =>
          Array.isArray(category.items)
            ? category.items.map((item: any) => ({
                categoryName: category.displayName || category.name || 'Menu',
                itemName: item.name || item.title || 'Item',
                price: item.price,
                description: item.description,
                image: item.image,
              }))
            : [],
        )
      : [];

    const categories = Array.isArray(rawExtraction.categories)
      ? rawExtraction.categories.map((c: any) => ({
          name: c.name || c.displayName || 'scanned',
          displayName: c.displayName || c.name || 'Scanned',
          items: Array.isArray(c.items)
            ? c.items.map((i: any) => ({
                name: i.name || i.title || 'Item',
                description: i.description,
                price: typeof i.price === 'number' ? i.price : parseFloat(i.price) || 0,
                currency: i.currency || 'INR',
              }))
            : [],
        }))
      : [];

    return {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      brandDescription: restaurant.brandDescription,
      cuisineTags: restaurant.cuisineTags,
      status: restaurant.status,
      onboardingStep: restaurant.onboardingStep,
      extractedMenuItems,
      categories,
      rawExtraction,
    };
  }

  /**
   * Get all documents for a restaurant - accessible to restaurant admin and super admin
   */
  async getRestaurantDocuments(restaurantId: string) {
    await this.findOne(restaurantId);

    const documents = await this.documentRepository.find({
      where: { restaurantId },
      order: { uploadedAt: 'DESC' },
    });

    return documents.map(doc => ({
      id: doc.id,
      type: doc.type,
      filename: doc.filename,
      uploadedAt: doc.uploadedAt,
      status: doc.status,
      viewUrl: `/api/v1/documents/preview/${doc.id}`,
    }));
  }

  /**
   * Super-Admin: Get all pending restaurants for review
   * (after sales operator submits for review)
   */
  async getPendingRestaurantsForReview() {
    const pendingRestaurants = await this.restaurantRepository.find({
      where: { status: 'review' },
      order: { createdAt: 'DESC' },
    });

    // Fetch documents and menu data for each restaurant
    const restaurantsWithDetails = await Promise.all(
      pendingRestaurants.map(async (restaurant) => {
        const documents = await this.documentRepository.find({
          where: { restaurantId: restaurant.id },
          order: { uploadedAt: 'DESC' },
        });

        const rawExtraction = restaurant.extractedMenu || { categories: [] };
        const categories = Array.isArray(rawExtraction.categories)
          ? rawExtraction.categories.map((c: any) => ({
              name: c.name || c.displayName || 'scanned',
              displayName: c.displayName || c.name || 'Scanned',
              itemCount: Array.isArray(c.items) ? c.items.length : 0,
            }))
          : [];

        return {
          id: restaurant.id,
          name: restaurant.name,
          ownerName: restaurant.ownerName,
          email: restaurant.email,
          phone: restaurant.phone,
          address: restaurant.address,
          city: restaurant.city,
          state: restaurant.state,
          zipCode: restaurant.zipCode,
          status: restaurant.status,
          onboardingStep: restaurant.onboardingStep,
          createdAt: restaurant.createdAt,
          riskScore: restaurant.riskScore,
          documents: documents.map(doc => ({
            id: doc.id,
            type: doc.type,
            filename: doc.filename,
            uploadedAt: doc.uploadedAt,
            status: doc.status,
          })),
          extractedMenu: {
            categories,
            itemCount: rawExtraction.categories?.reduce(
              (sum: number, c: any) => sum + (Array.isArray(c.items) ? c.items.length : 0),
              0,
            ) || 0,
          },
          brandDescription: restaurant.brandDescription,
          cuisineTags: restaurant.cuisineTags,
          gstNumber: restaurant.gstNumber,
          gstExpiryDate: restaurant.gstExpiryDate,
          fssaiNumber: restaurant.fssaiNumber,
          fssaiExpiryDate: restaurant.fssaiExpiryDate,
          bankName: restaurant.bankName,
          bankAccountNumber: restaurant.bankAccountNumber,
          ifscCode: restaurant.ifscCode,
          temporaryClosure: restaurant.temporaryClosure,
          holidayMode: restaurant.holidayMode,
        };
      }),
    );

    return restaurantsWithDetails;
  }

  /**
   * Super-Admin: Get single restaurant details for review page
   */
  async getRestaurantForReview(restaurantId: string) {
    const restaurant = await this.findOne(restaurantId);

    const documents = await this.documentRepository.find({
      where: { restaurantId },
      order: { uploadedAt: 'DESC' },
    });

    const rawExtraction = restaurant.extractedMenu || { categories: [] };
    const categories = Array.isArray(rawExtraction.categories)
      ? rawExtraction.categories.map((c: any) => ({
          name: c.name || c.displayName || 'scanned',
          displayName: c.displayName || c.name || 'Scanned',
          items: Array.isArray(c.items)
            ? c.items.map((i: any) => ({
                name: i.name || i.title || 'Item',
                description: i.description,
                price: typeof i.price === 'number' ? i.price : parseFloat(i.price) || 0,
                currency: i.currency || 'INR',
              }))
            : [],
        }))
      : [];

    return {
      id: restaurant.id,
      name: restaurant.name,
      ownerName: restaurant.ownerName,
      email: restaurant.email,
      phone: restaurant.phone,
      address: restaurant.address,
      city: restaurant.city,
      state: restaurant.state,
      zipCode: restaurant.zipCode,
      status: restaurant.status,
      onboardingStep: restaurant.onboardingStep,
      createdAt: restaurant.createdAt,
      riskScore: restaurant.riskScore,
      documents: documents.map(doc => ({
        id: doc.id,
        type: doc.type,
        filename: doc.filename,
        uploadedAt: doc.uploadedAt,
        status: doc.status,
        viewUrl: `/api/v1/documents/preview/${doc.id}`,
      })),
      extractedMenu: {
        categories,
        itemCount: rawExtraction.categories?.reduce(
          (sum: number, c: any) => sum + (Array.isArray(c.items) ? c.items.length : 0),
          0,
        ) || 0,
      },
      brandDescription: restaurant.brandDescription,
      cuisineTags: restaurant.cuisineTags,
      gstNumber: restaurant.gstNumber,
      gstExpiryDate: restaurant.gstExpiryDate,
      fssaiNumber: restaurant.fssaiNumber,
      fssaiExpiryDate: restaurant.fssaiExpiryDate,
      bankName: restaurant.bankName,
      bankAccountNumber: restaurant.bankAccountNumber,
      ifscCode: restaurant.ifscCode,
      temporaryClosure: restaurant.temporaryClosure,
      holidayMode: restaurant.holidayMode,
    };
  }

  /**
   * Called when a sales operator or restaurant admin submits the registration for review.
   * Sets restaurant status to 'review' and notifies the submitting user via email.
   */
  async submitForReview(restaurantId: string, user: any) {
    const restaurant = await this.findOne(restaurantId);

    // If restaurant admin is submitting, ensure they own the restaurant
    if (user?.role === UserRole.RestaurantAdmin) {
      const rid = user?.restaurant?.id;
      if (!rid || rid !== restaurantId) throw new BadRequestException('Access denied');
    }

    restaurant.status = 'review';
    restaurant.onboardingStep = Math.max(restaurant.onboardingStep, 4);

    const updated = await this.restaurantRepository.save(restaurant);

    // Notify the submitting user (sales operator or admin) by email
    const toEmail = user?.email;
    if (toEmail) {
      await this.notificationsService.sendRegistrationSubmitted({
        email: toEmail,
        restaurantId: updated.id,
        restaurantName: updated.name ?? '',
        submittedBy: user?.displayName ?? user?.email,
      });
    }

    this.logger.log(`Restaurant ${restaurantId} submitted for review by ${user?.email}`);

    return {
      id: updated.id,
      status: updated.status,
      onboardingStep: updated.onboardingStep,
      message: 'Submitted for review successfully.',
    };
  }

  /**
   * Super-Admin: Approve restaurant registration and send credentials to restaurant admin
   */
  async approveRestaurantRegistration(restaurantId: string) {
    const restaurant = await this.findOne(restaurantId);

    if (restaurant.status === 'active') {
      throw new BadRequestException('Restaurant is already approved and active.');
    }

    // Update restaurant status to active
    restaurant.status = 'active';
    restaurant.onboardingStep = 4; // Mark as approved by super-admin
    const updatedRestaurant = await this.restaurantRepository.save(restaurant);

    // Find restaurant admin user
    const restaurantAdmin = await this.userRepository.findOne({
      where: {
        restaurant: { id: restaurantId },
        role: UserRole.RestaurantAdmin,
      },
    });

    if (restaurantAdmin) {
      // Generate a new temporary password, persist it, and send credentials now
      const temporaryPassword = this.generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      // update restaurant admin password and require password change on first login
      restaurantAdmin.passwordHash = passwordHash;
      restaurantAdmin.mustChangePassword = true;
      await this.userRepository.save(restaurantAdmin);

      await this.notificationsService.sendRestaurantCredentials({
        email: restaurantAdmin.email ?? '',
        phone: restaurant.phone ?? '',
        password: temporaryPassword,
        restaurantName: restaurant.name ?? '',
      });
    }

    this.logger.log(
      `Restaurant ${restaurantId} (${restaurant.name}) approved by super-admin. Email sent to ${restaurantAdmin?.email}`,
    );

    return {
      id: updatedRestaurant.id,
      status: updatedRestaurant.status,
      onboardingStep: updatedRestaurant.onboardingStep,
      message: 'Restaurant approved successfully. Credentials email sent to restaurant admin.',
      restaurantName: updatedRestaurant.name,
      approvedAt: new Date(),
    };
  }

  /**
   * Super-Admin: Finalize and approve extracted menu for restaurant admin
   */
  async approveFinalizeMenu(restaurantId: string, payload?: { approvalNotes?: string }) {
    const restaurant = await this.findOne(restaurantId);

    if (!restaurant.extractedMenu || restaurant.extractedMenu.categories?.length === 0) {
      throw new BadRequestException(
        'No extracted menu available for this restaurant. Please ensure menu was extracted in Step 3.',
      );
    }

    // Mark menu as approved and finalized
    restaurant.extractedMenu = {
      ...restaurant.extractedMenu,
      approvedByAdmin: true,
      approvalDate: new Date(),
      approvalNotes: payload?.approvalNotes,
    };

    const updatedRestaurant = await this.restaurantRepository.save(restaurant);

    // Send menu approval notification to restaurant admin
    const restaurantAdmin = await this.userRepository.findOne({
      where: {
        restaurant: { id: restaurantId },
        role: UserRole.RestaurantAdmin,
      },
    });

    if (restaurantAdmin) {
      this.logger.log(
        `Menu approved for restaurant ${restaurantId}. Notification available for restaurant admin at dashboard.`,
      );
    }

    this.logger.log(
      `Menu approved and finalized for restaurant ${restaurantId} by super-admin.`,
    );

    return {
      id: updatedRestaurant.id,
      restaurantName: updatedRestaurant.name,
      status: updatedRestaurant.status,
      message: 'Menu approved and finalized. Restaurant admin has been notified.',
      extractedMenu: {
        categories: updatedRestaurant.extractedMenu.categories,
        approvedAt: updatedRestaurant.extractedMenu.approvalDate,
      },
    };
  }

  async verifyPan(pan: string, nameAsPerPan?: string, dateOfBirth?: string) {
    const upperPan = (pan || '').toUpperCase().trim();
    const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;

    if (!PAN_REGEX.test(upperPan)) {
      return { valid: false, message: 'Invalid PAN format. Expected: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F).' };
    }

    const sandboxKey    = process.env.SANDBOX_API_KEY    || '';
    const sandboxSecret = process.env.SANDBOX_API_SECRET || '';

    // No API key — local format validation only
    if (!sandboxKey || !sandboxSecret) {
      this.logger.warn('SANDBOX_API_KEY/SECRET not set — PAN verified by format only.');
      const typeMap: Record<string, string> = {
        P: 'Individual', C: 'Company', H: 'Hindu Undivided Family',
        F: 'Firm', A: 'Association', T: 'Trust', B: 'Body of Individuals',
        L: 'Local Authority', J: 'Artificial Juridical Person', G: 'Government',
      };
      const panType = typeMap[upperPan[3]] ?? 'Individual';
      return {
        valid: true,
        name: undefined,
        message: `PAN format valid (${panType}). Configure SANDBOX_API_KEY in .env for live KYC.`,
      };
    }

    try {
      // 1. Authenticate — secret goes in x-api-secret header, live keys use api.sandbox.co.in
      const authRes = await fetch('https://api.sandbox.co.in/authenticate', {
        method: 'POST',
        headers: {
          'x-api-key': sandboxKey,
          'x-api-secret': sandboxSecret,
          'x-api-version': '1.0',
          'Content-Type': 'application/json',
        },
      });
      if (!authRes.ok) {
        const errText = await authRes.text();
        this.logger.error(`Sandbox auth failed ${authRes.status}: ${errText}`);
        return { valid: false, message: 'Unable to authenticate with verification service.' };
      }
      const authData = await authRes.json();
      const accessToken = authData.access_token;
      if (!accessToken) {
        this.logger.error(`Sandbox auth returned no token: ${JSON.stringify(authData)}`);
        return { valid: false, message: 'Verification service did not return a token.' };
      }

      // 2. Verify PAN — full payload as per sandbox docs
      const panPayload: Record<string, any> = {
        '@entity': 'in.co.sandbox.kyc.pan_verification.request',
        pan: upperPan,
        consent: 'Y',
        reason: 'For restaurant onboarding',
      };
      if (nameAsPerPan?.trim()) panPayload['name_as_per_pan'] = nameAsPerPan.trim();
      if (dateOfBirth?.trim())  panPayload['date_of_birth']   = dateOfBirth.trim(); // DD/MM/YYYY

      const panRes = await fetch('https://api.sandbox.co.in/kyc/pan/verify', {
        method: 'POST',
        headers: {
          'x-api-key': sandboxKey,
          'x-api-version': '1.0',
          'Authorization': accessToken, // sandbox uses raw token, not "Bearer <token>"
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(panPayload),
      });
      const panData = await panRes.json();
      this.logger.log(`PAN verify response: ${JSON.stringify(panData)}`);

      // Response structure: { code: 200, data: { status: 'valid'|'invalid', name, remarks, ... } }
      const d = panData?.data;
      const status = d?.status;

      if (status === 'valid' || status === 'E') {
        const name = d?.name ?? d?.full_name ?? d?.pan_holder_name;
        const matchInfo = [];
        if (d?.name_as_per_pan_match === true)  matchInfo.push('name matched');
        if (d?.date_of_birth_match   === true)  matchInfo.push('DOB matched');
        const extra = matchInfo.length ? ` (${matchInfo.join(', ')})` : '';
        return { valid: true, name, message: `PAN verified successfully${extra}` };
      }

      // Invalid / not found
      const errMsg = d?.remarks ?? d?.message ?? panData.message ?? 'PAN not found or invalid';
      return { valid: false, message: String(errMsg) };
    } catch (err) {
      this.logger.error(`PAN verification error: ${err}`);
      return { valid: false, message: 'Verification service temporarily unavailable' };
    }
  }

  private calculateRiskScore(
    payload: CreateRestaurantDto,
    suspicious: boolean,
  ) {
    let score = 0;

    if (suspicious) score += 0.5;

    if (!payload.latitude || !payload.longitude) score += 0.2;

    if (
      payload.email?.includes('gmail.com') ||
      payload.email?.includes('yahoo.com')
    )
      score += 0.2;

    if (!payload.gstNumber || !payload.fssaiNumber) score += 0.1;

    return Math.min(score, 1);
  }

  private generateTemporaryPassword() {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#';

    let password = '';

    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
  }
}