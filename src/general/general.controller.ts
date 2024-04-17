import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { GeneralService } from './general.service';
import { ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';

@UseGuards(SessionAuthGuard)
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
