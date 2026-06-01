import { IsEnum } from 'class-validator';
import { CustomerStatus } from '../../../entities/customer.entity';

export class UpdateCustomerStatusDto {
  @IsEnum(CustomerStatus)
  status: CustomerStatus;
}
