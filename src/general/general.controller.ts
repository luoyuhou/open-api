import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { GeneralService } from './general.service';
import { CreateGeneralDto } from './dto/create-general.dto';
import { UpdateGeneralDto } from './dto/update-general.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('general')
@ApiTags('general')
export class GeneralController {
  constructor(private readonly generalService: GeneralService) {}

  @Post()
  create(@Body() createGeneralDto: CreateGeneralDto) {
    return this.generalService.create(createGeneralDto);
  }

  @Get()
  findAll() {
    return this.generalService.findAll();
  }
}
