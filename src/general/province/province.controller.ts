import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ProvinceService } from './province.service';
import { SearchProvinceListDto } from './dto/search-province-list.dto';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';

@UseGuards(SessionAuthGuard)
@Controller('general/province')
@ApiTags('general/province')
export class ProvinceController {
  constructor(private readonly provinceService: ProvinceService) {}

  @Get()
  @ApiProperty()
  async findAll(@Query() { pid }: SearchProvinceListDto) {
    return this.provinceService.findAll(pid);
  }

  @Get(':code')
  @ApiProperty()
  async findOne(@Param('code') code: string) {
    return this.provinceService.findOne(code);
  }
}
