import { PartialType } from '@nestjs/swagger';
import { CreateHomeBannerDto } from './create-home-banner.dto';

export class UpdateHomeBannerDto extends PartialType(CreateHomeBannerDto) {}
