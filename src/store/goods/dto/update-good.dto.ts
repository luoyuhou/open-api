import { PartialType } from '@nestjs/swagger';
import { CreateGoodDto } from './create-good.dto';

export class UpdateGoodDto extends PartialType(CreateGoodDto) {}
