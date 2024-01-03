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
import { ApiTags } from '@nestjs/swagger';
import { CreateGoodsVersionDto } from './dto/create-goods-version.dto';
import { UpdateGoodsVersionDto } from './dto/update-goods-version.dto';

@Controller('store/goods')
@ApiTags('store/goods')
export class GoodsController {
  constructor(private readonly goodsService: GoodsService) {}

  @Post()
  async create(@Body() createGoodDto: CreateGoodDto) {
    return this.goodsService.create(createGoodDto);
  }

  @Get('category/:id')
  async findAll(@Param('id') id: string) {
    return this.goodsService.findAll(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.goodsService.findOne(id);
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

  @Post('version')
  async createGoodsVersion(@Body() createGoodsVersion: CreateGoodsVersionDto) {
    return this.goodsService.createGoodsVersion(createGoodsVersion);
  }

  @Patch('version/:id')
  async updateGoodsVersion(
    @Param('id') id: string,
    @Body() updateGoodsVersion: UpdateGoodsVersionDto,
  ) {
    return this.goodsService.updateGoodsVersion(id, updateGoodsVersion);
  }
}
