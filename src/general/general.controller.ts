import { Controller, Get, Post } from '@nestjs/common';
import { GeneralService } from './general.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('general')
@ApiTags('general')
export class GeneralController {
  constructor(private readonly generalService: GeneralService) {}

  @Post('tools/:feature')
  create() {
    return { message: 'ok' };
  }

  @Get()
  findAll() {
    return this.generalService.findAll();
  }
}
