import { IsOptional, IsString } from 'class-validator';

export class ReviewMenuItemChangeRequestDto {
  @IsOptional()
  @IsString()
  reviewComment?: string;
}
