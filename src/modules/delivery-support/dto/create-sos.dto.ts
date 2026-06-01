import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSosDto {
  @IsNotEmpty()
  @IsString()
  partnerId: string;

  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  assignmentId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
