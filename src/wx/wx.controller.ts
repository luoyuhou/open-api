import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { WxService } from './wx.service';
import { CreateWxDto } from './dto/create-wx.dto';
import { UpdateWxDto } from './dto/update-wx.dto';

@Controller('wx')
export class WxController {
  constructor(private readonly wxService: WxService) {}

  @Post()
  create(@Body() createWxDto: CreateWxDto) {
    return this.wxService.create(createWxDto);
  }

  @Get()
  findAll() {
    return this.wxService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.wxService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWxDto: UpdateWxDto) {
    return this.wxService.update(+id, updateWxDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.wxService.remove(+id);
  }
}
