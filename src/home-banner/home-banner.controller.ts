import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { Pagination } from '../common/dto/pagination';
import { HomeBannerService } from './home-banner.service';
import { CreateHomeBannerDto } from './dto/create-home-banner.dto';
import { UpdateHomeBannerDto } from './dto/update-home-banner.dto';

@UseGuards(SessionAuthGuard)
@Controller('home-banners')
@ApiTags('home-banners')
export class HomeBannerController {
  constructor(private readonly homeBannerService: HomeBannerService) {}

  @Post('pagination')
  @ApiProperty()
  async pagination(@Body() pagination: Pagination) {
    return this.homeBannerService.pagination(pagination);
  }

  @Post()
  async create(@Body() dto: CreateHomeBannerDto) {
    return this.homeBannerService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') banner_id: string,
    @Body() dto: UpdateHomeBannerDto,
  ) {
    return this.homeBannerService.update(banner_id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') banner_id: string) {
    return this.homeBannerService.remove(banner_id);
  }
}
