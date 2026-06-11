import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('店铺员工管理')
@Controller('store/staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @ApiOperation({ summary: '添加员工' })
  create(@Body() createStaffDto: CreateStaffDto) {
    return this.staffService.create(createStaffDto);
  }

  @Get('list')
  @ApiOperation({ summary: '获取店铺员工列表' })
  findAll(@Query('storeId') storeId: string) {
    return this.staffService.findAll(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取员工详情' })
  findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新员工信息' })
  update(@Param('id') id: string, @Body() updateStaffDto: UpdateStaffDto) {
    return this.staffService.update(id, updateStaffDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除员工' })
  remove(@Param('id') id: string) {
    return this.staffService.remove(id);
  }
}
