import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProvinceService } from './province.service';

@Controller('general/province')
export class ProvinceController {
  constructor(private readonly provinceService: ProvinceService) {}

  @Get()
  findAll(@Query('pid') pid: string) {
    return this.provinceService.findAll(pid);
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.provinceService.findOne(+code);
  }
}
