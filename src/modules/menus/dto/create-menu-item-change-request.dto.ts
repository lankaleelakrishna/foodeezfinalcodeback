import { IsString } from 'class-validator';
import { UpdateMenuItemDto } from './update-menu-item.dto';

export class CreateMenuItemChangeRequestDto extends UpdateMenuItemDto {
  @IsString()
  changeDescription: string;
}
