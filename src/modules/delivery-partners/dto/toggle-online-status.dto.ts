import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleOnlineStatusDto {
  @IsNotEmpty()
  @IsBoolean()
  isOnline: boolean;
}
