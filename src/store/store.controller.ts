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
import { SearchHistoryDto } from './dto/search-history.dto';
import { ApproverStoreDto } from './dto/approver-store.dto';

@UseGuards(SessionAuthGuard)
@Controller('store')
@ApiTags('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post()
  @ApiProperty()
  @ApiOkResponse({ type: StoreEntity })
  async create(
    @Req() req: Request,
    @Body() createStoreDto: CreateStoreInputDto,
  ) {
    const user = req.user as UserEntity;
    return this.storeService.create(user, createStoreDto);
  }

  @Post('apply-list')
  @ApiProperty()
  async applyList(@Req() req: Request, @Body() pagination: Pagination) {
    const user = req.user as UserEntity;
    pagination.filtered.push({ id: 'user_id', value: user.user_id });
    return this.storeService.pagination(pagination);
  }

  @Post('pagination')
  @ApiProperty()
  async pagination(@Body() pagination: Pagination) {
    return this.storeService.pagination(pagination);
  }

  @Get('history/:id')
  @ApiProperty()
  async findHistory(
    @Param('id') id: string,
    @Query() { type }: SearchHistoryDto,
  ) {
    return this.storeService.findHistory(id, type);
  }

  @Get('search')
  @ApiProperty()
  async search(@Query() args: SearchStoreDto) {
    return this.storeService.searchMany(args);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.storeService.findOne(id);
  }

  @Post('/approver')
  async adapter(@Body() args: ApproverStoreDto, @Req() req: Request) {
    return this.storeService.adapter(args, req.user as UserEntity);
  }
}
