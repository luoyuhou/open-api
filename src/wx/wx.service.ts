import { Injectable } from '@nestjs/common';
import { CreateWxDto } from './dto/create-wx.dto';
import { UpdateWxDto } from './dto/update-wx.dto';

@Injectable()
export class WxService {
  create(createWxDto: CreateWxDto) {
    return 'This action adds a new wx';
  }

  findAll() {
    return `This action returns all wx`;
  }

  findOne(id: number) {
    return `This action returns a #${id} wx`;
  }

  update(id: number, updateWxDto: UpdateWxDto) {
    return `This action updates a #${id} wx`;
  }

  remove(id: number) {
    return `This action removes a #${id} wx`;
  }
}
