import { IsString, MaxLength } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;

  @IsString()
  @MaxLength(200)
  deviceId: string;
}
