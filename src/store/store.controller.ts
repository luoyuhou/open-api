import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { CreateStoreInputDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { StoreEntity } from './entities/store.entity';
import { Pagination } from '../common/dto/pagination';
import { SearchStoreDto } from './dto/search-store.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import { Request } from 'express';

@UseGuards(SessionAuthGuard)
@Controller('store')
@ApiTags('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post()
  @ApiProperty()
  @ApiOkResponse({ type: StoreEntity })
  create(@Req() req: Request, @Body() createStoreDto: CreateStoreInputDto) {
    const user = req.user as UserEntity;
    return this.storeService.create(user, createStoreDto);
  }

  @Post()
  @UseGuards(SessionAuthGuard)
  @ApiProperty()
  pagination(@Body() pagination: Pagination) {
    return this.storeService.pagination(pagination);
  }

  @Get('search')
  @UseGuards(SessionAuthGuard)
  @ApiProperty()
  async search(@Query() args: SearchStoreDto) {
    return this.storeService.searchMany(args);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storeService.findOne(id);
  }
}
