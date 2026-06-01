import { IsEnum, IsNotEmpty } from 'class-validator';
import { DeliveryPartnerStatus } from '../../../entities/delivery-partner.entity';

export class UpdatePartnerStatusDto {
  @IsNotEmpty()
  @IsEnum(DeliveryPartnerStatus)
  status: DeliveryPartnerStatus;
}
