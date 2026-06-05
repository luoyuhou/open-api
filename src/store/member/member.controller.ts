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
} from '@nestjs/common';
import { MemberService } from './member.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CreateRechargeDto } from './dto/create-recharge.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';

@UseGuards(SessionAuthGuard)
@Controller('store/member')
@ApiTags('store/member')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Post('recharge')
  @ApiOperation({ summary: '会员充值' })
  recharge(@Body() createRechargeDto: CreateRechargeDto) {
    return this.memberService.recharge(createRechargeDto);
  }

  @Get('recharges/:storeId')
  @ApiOperation({ summary: '获取充值记录' })
  findRecharges(
    @Param('storeId') storeId: string,
    @Query('member_id') memberId?: string,
  ) {
    return this.memberService.findRecharges(storeId, memberId);
  }

  @Get('orders/:memberId')
  @ApiOperation({ summary: '获取会员消费记录' })
  findMemberOrders(@Param('memberId') memberId: string) {
    return this.memberService.findMemberOrders(memberId);
  }

  @Post()
  @ApiOperation({ summary: '创建会员' })
  create(@Body() createMemberDto: CreateMemberDto) {
    return this.memberService.create(createMemberDto);
  }

  @Get('list/:storeId')
  @ApiOperation({ summary: '获取店铺会员列表' })
  findAll(@Param('storeId') storeId: string, @Query('query') query?: string) {
    return this.memberService.findAll(storeId, query);
  }

  @Get('search')
  @ApiOperation({ summary: '根据手机号搜索会员' })
  findByPhone(
    @Query('store_id') storeId: string,
    @Query('phone') phone: string,
  ) {
    return this.memberService.findByPhone(storeId, phone);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取会员详情' })
  findOne(@Param('id') id: string) {
    return this.memberService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新会员信息' })
  update(@Param('id') id: string, @Body() updateMemberDto: UpdateMemberDto) {
    return this.memberService.update(id, updateMemberDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除（禁用）会员' })
  remove(@Param('id') id: string) {
    return this.memberService.remove(id);
  }
}
