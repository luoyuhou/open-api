import { PartialType } from '@nestjs/swagger';
import { CreateWxDto } from './create-wx.dto';

export class UpdateWxDto extends PartialType(CreateWxDto) {}
