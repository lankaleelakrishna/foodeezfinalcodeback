import { Body, Controller, Get, Param, Post, Patch, UseGuards, ForbiddenException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { CreateRestaurantUserDto } from './dto/create-restaurant-user.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { RegisterStep1Dto } from './dto/register-step1.dto';
import { RegisterStep2Dto } from './dto/register-step2.dto';
import { RegisterStep3Dto } from './dto/register-step3.dto';
import { MenuExtractionResponseDto } from './dto/menu-extraction-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('restaurants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @Roles(UserRole.SalesOperator, UserRole.SuperAdmin)
  create(@Body() payload: CreateRestaurantDto) {
    return this.restaurantsService.create(payload);
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    const isRestaurantAdmin = user?.role === UserRole.RestaurantAdmin;
    const restaurantId = user?.restaurant?.id;

    const list = await this.restaurantsService.findAll(
      isRestaurantAdmin,
      restaurantId,
    );

    if (isRestaurantAdmin) {
      // annotate which restaurant belongs to the admin so frontend can show edit actions
      return list.map((r) => ({ ...r, isMine: !!(restaurantId && restaurantId === r.id) }));
    }

    return list;
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    if (user?.role === UserRole.RestaurantAdmin) {
      const restaurantId = user?.restaurant?.id;
      if (!restaurantId || restaurantId !== id) {
        throw new ForbiddenException('Access denied');
      }
    }
    return this.restaurantsService.findOne(id);
  }

  @Get(':id/onboarding')
  getOnboardingStatus(@Param('id') id: string, @CurrentUser() user: any) {
    if (user?.role === UserRole.RestaurantAdmin) {
      const restaurantId = user?.restaurant?.id;
      if (!restaurantId || restaurantId !== id) throw new ForbiddenException('Access denied');
    }
    return this.restaurantsService.getOnboardingStatus(id);
  }

  @Get(':id/users')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  getUsers(@Param('id') id: string, @CurrentUser() user: any) {
    if (user?.role === UserRole.RestaurantAdmin) {
      const restaurantId = user?.restaurant?.id;
      if (!restaurantId || restaurantId !== id) throw new ForbiddenException('Access denied');
    }
    return this.restaurantsService.findUsersByRestaurant(id);
  }

  @Patch(':id/onboarding-step')
  @Roles(UserRole.RestaurantAdmin, UserRole.SuperAdmin)
  advanceOnboardingStep(@Param('id') id: string, @Body('step') step: number, @CurrentUser() user: any) {
    if (user?.role === UserRole.RestaurantAdmin) {
      const restaurantId = user?.restaurant?.id;
      if (!restaurantId || restaurantId !== id) throw new ForbiddenException('Access denied');
    }
    return this.restaurantsService.advanceOnboardingStep(id, step);
  }

  @Post(':id/users')
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  createUser(@Param('id') restaurantId: string, @Body() payload: CreateRestaurantUserDto, @CurrentUser() user: any) {
    if (user?.role === UserRole.RestaurantAdmin) {
      const rid = user?.restaurant?.id;
      if (!rid || rid !== restaurantId) throw new ForbiddenException('Access denied');
    }
    return this.restaurantsService.createRestaurantUser(restaurantId, payload);
  }

  @Patch(':id')
  @Roles(UserRole.RestaurantAdmin, UserRole.SuperAdmin)
  update(@Param('id') id: string, @Body() payload: UpdateRestaurantDto, @CurrentUser() user: any) {
    if (user?.role === UserRole.RestaurantAdmin) {
      const restaurantId = user?.restaurant?.id;
      if (!restaurantId || restaurantId !== id) throw new ForbiddenException('Access denied');
    }
    return this.restaurantsService.update(id, payload);
  }

  /**
   * 3-Step Registration Process
   */

  @Post('register/step1')
  registerStep1(@Body() payload: RegisterStep1Dto) {
    return this.restaurantsService.registerStep1(payload);
  }

  @Post(':id/register/step2')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RestaurantAdmin, UserRole.SuperAdmin)
  registerStep2(
    @Param('id') restaurantId: string,
    @Body() payload: RegisterStep2Dto,
    @CurrentUser() user: any,
  ) {
    if (user?.role === UserRole.RestaurantAdmin) {
      const rid = user?.restaurant?.id;
      if (!rid || rid !== restaurantId) throw new ForbiddenException('Access denied');
    }
    return this.restaurantsService.registerStep2(restaurantId, payload);
  }

  @Post(':id/register/step3/cover-photo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RestaurantAdmin, UserRole.SuperAdmin)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const uploadPath = `./uploads/registration/${req.params.id}`;
          if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          cb(null, `cover-photo-${Date.now()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
          return cb(new BadRequestException('Only JPEG, PNG, or WebP images are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadCoverPhoto(
    @Param('id') restaurantId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (user?.role === UserRole.RestaurantAdmin) {
      const rid = user?.restaurant?.id;
      if (!rid || rid !== restaurantId) throw new ForbiddenException('Access denied');
    }
    if (!file) throw new BadRequestException('File is required');
    return { key: file.path.replace(/\\/g, '/') };
  }

  @Post(':id/register/step3/extract')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RestaurantAdmin, UserRole.SuperAdmin)
  async extractMenuForRegistration(
    @Param('id') restaurantId: string,
    @Body() payload: RegisterStep3Dto,
    @CurrentUser() user: any,
  ): Promise<MenuExtractionResponseDto> {
    if (user?.role === UserRole.RestaurantAdmin) {
      const rid = user?.restaurant?.id;
      if (!rid || rid !== restaurantId) throw new ForbiddenException('Access denied');
    }
    return this.restaurantsService.extractMenuForRegistration(restaurantId, payload);
  }

  @Post(':id/register/step3')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RestaurantAdmin, UserRole.SuperAdmin)
  registerStep3(
    @Param('id') restaurantId: string,
    @Body() payload: RegisterStep3Dto,
    @CurrentUser() user: any,
  ) {
    if (user?.role === UserRole.RestaurantAdmin) {
      const rid = user?.restaurant?.id;
      if (!rid || rid !== restaurantId) throw new ForbiddenException('Access denied');
    }
    return this.restaurantsService.registerStep3(restaurantId, payload);
  }

  @Get(':id/registration-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  getRegistrationStatus(
    @Param('id') restaurantId: string,
    @CurrentUser() user: any,
  ) {
    if (user?.role === UserRole.RestaurantAdmin) {
      const rid = user?.restaurant?.id;
      if (!rid || rid !== restaurantId) throw new ForbiddenException('Access denied');
    }
    return this.restaurantsService.getExtractedMenuByRestaurant(restaurantId);
  }

  @Get(':id/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RestaurantAdmin, UserRole.SalesOperator, UserRole.SuperAdmin)
  getRestaurantDocuments(
    @Param('id') restaurantId: string,
    @CurrentUser() user: any,
  ) {
    if (user?.role === UserRole.RestaurantAdmin) {
      const rid = user?.restaurant?.id;
      if (!rid || rid !== restaurantId) throw new ForbiddenException('Access denied');
    }
    return this.restaurantsService.getRestaurantDocuments(restaurantId);
  }

  /**
   * Super-Admin Approval Workflow
   */

  @Get('admin/pending-for-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SuperAdmin)
  getPendingRestaurantsForReview() {
    return this.restaurantsService.getPendingRestaurantsForReview();
  }

  @Get('admin/review/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SuperAdmin)
  getRestaurantForReview(@Param('id') restaurantId: string) {
    return this.restaurantsService.getRestaurantForReview(restaurantId);
  }

  @Post('verify-pan')
  @Roles(UserRole.SalesOperator, UserRole.SuperAdmin, UserRole.RestaurantAdmin)
  verifyPan(@Body('pan') pan: string, @Body('name') name?: string, @Body('dateOfBirth') dob?: string) {
    return this.restaurantsService.verifyPan(pan, name, dob);
  }

  @Post(':id/approve-registration')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SuperAdmin)
  approveRestaurantRegistration(@Param('id') restaurantId: string) {
    return this.restaurantsService.approveRestaurantRegistration(restaurantId);
  }

  @Post(':id/approve-finalize-menu')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SuperAdmin)
  approveFinalizeMenu(
    @Param('id') restaurantId: string,
    @Body() payload?: { approvalNotes?: string },
  ) {
    return this.restaurantsService.approveFinalizeMenu(restaurantId, payload);
  }

  @Post(':id/submit-for-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SalesOperator, UserRole.RestaurantAdmin, UserRole.SuperAdmin)
  submitForReview(@Param('id') restaurantId: string, @CurrentUser() user: any) {
    return this.restaurantsService.submitForReview(restaurantId, user);
  }
}
