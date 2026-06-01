import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DeliveryStatus } from '../../../entities/delivery-assignment.entity';

export class UpdateAssignmentStatusDto {
  @IsNotEmpty()
  @IsEnum(DeliveryStatus)
  status: DeliveryStatus;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
