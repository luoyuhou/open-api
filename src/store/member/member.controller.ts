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
import { MemberService } from './member.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CreateRechargeDto } from './dto/create-recharge.dto';
import { RefundMemberBalanceDto } from './dto/refund-member-balance.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { UserEntity } from '../../users/entities/user.entity';

@UseGuards(SessionAuthGuard)
@Controller('store/member')
@ApiTags('store/member')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get('mine')
  @ApiOperation({ summary: '当前用户在各店的会员列表（按绑定手机号）' })
  findMyMemberships(@Req() req: { user: UserEntity }) {
    return this.memberService.findMyMemberships(req.user?.phone);
  }

  @Get('mine/:memberId')
  @ApiOperation({ summary: '我的某店会员详情（消费+充值）' })
  findMyMembershipDetail(
    @Param('memberId') memberId: string,
    @Req() req: { user: UserEntity },
  ) {
    return this.memberService.findMyMembershipDetail(memberId, req.user?.phone);
  }

  @Post('recharge')
  @ApiOperation({ summary: '会员充值' })
  recharge(@Body() createRechargeDto: CreateRechargeDto) {
    return this.memberService.recharge(createRechargeDto);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: '会员账户退费（扣减余额，积分可选清空）' })
  refundBalance(
    @Param('id') id: string,
    @Body() dto: RefundMemberBalanceDto,
    @Req() req: { user: UserEntity },
  ) {
    return this.memberService.refundBalance(id, req.user, dto);
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
