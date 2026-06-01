import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReassignDto {
  @IsNotEmpty()
  @IsString()
  partnerId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
