import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async create(
    @Body() dto: CreateHomeBannerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.homeBannerService.create(dto, file);
  }

  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async update(
    @Param('id') banner_id: string,
    @Body() dto: UpdateHomeBannerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.homeBannerService.update(banner_id, dto, file);
  }

  @Delete(':id')
  async remove(@Param('id') banner_id: string) {
    return this.homeBannerService.remove(banner_id);
  }
}
