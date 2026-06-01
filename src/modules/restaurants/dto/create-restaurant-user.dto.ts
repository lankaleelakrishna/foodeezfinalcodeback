import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../../entities/user.entity';

export class CreateRestaurantUserDto {
  @IsNotEmpty()
  @IsString()
  displayName: string;

  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  password?: string;
}
