import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { GoodsService } from './goods.service';
import { CreateGoodDto } from './dto/create-good.dto';
import { UpdateGoodDto } from './dto/update-good.dto';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { CreateGoodsVersionDto } from './dto/create-goods-version.dto';
import { UpdateGoodsVersionDto } from './dto/update-goods-version.dto';
import { Pagination } from '../../common/dto/pagination';
import { UpsertGoodsVersionDto } from './dto/upsert-goods-version.dto';

@Controller('store/goods')
@ApiTags('store/goods')
export class GoodsController {
  constructor(private readonly goodsService: GoodsService) {}

  @Post()
  async create(@Body() createGoodDto: CreateGoodDto & CreateGoodsVersionDto) {
    return this.goodsService.create(createGoodDto);
  }

  @Post('pagination')
  @ApiProperty()
  async pagination(@Body() pagination: Pagination) {
    return this.goodsService.pagination(pagination);
  }

  @Get('version/:id')
  @ApiProperty()
  async goodsVersions(@Param('id') id: string) {
    const data = await this.goodsService.goodsVersions(id);
    return { data };
  }

  @Post('version/:goodsId')
  @ApiProperty()
  async upsertGoodsVersion(
    @Param('goodsId') goodsId: string,
    @Body() upsertGoodsVersionDto: UpsertGoodsVersionDto,
  ) {
    return this.goodsService.upsertGoodsVersion(goodsId, upsertGoodsVersionDto);
  }

  @Get('category/:id')
  async findAll(@Param('id') id: string) {
    return this.goodsService.findAll(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.goodsService.findOne(id);
    return { data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateGoodDto: UpdateGoodDto) {
    return this.goodsService.update(id, updateGoodDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.goodsService.remove(id);
  }

  @Patch('reactive/:id')
  async reactive(@Param('id') id: string) {
    return this.goodsService.reactive(id);
  }

  @Patch('version/:id')
  async updateGoodsVersion(
    @Param('id') id: string,
    @Body() updateGoodsVersion: UpdateGoodsVersionDto,
  ) {
    return this.goodsService.updateGoodsVersion(id, updateGoodsVersion);
  }
}
