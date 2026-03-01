import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { IsArray, ArrayNotEmpty, IsString, IsNotEmpty } from 'class-validator';

class CreateChatGroupDto {
  @ApiProperty({ description: '群聊名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: [String], description: '群成员 user_id 列表' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  memberIds: string[];
}

@UseGuards(SessionAuthGuard)
@Controller('chat')
@ApiTags('chat')
export class ChatController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('groups')
  @ApiBearerAuth()
  async createGroup(@Req() req: any, @Body() body: CreateChatGroupDto) {
    const { name, memberIds } = body;

    if (!name || !name.trim()) {
      throw new Error('群聊名称不能为空');
    }

    const uniqueMemberIds = Array.from(new Set(memberIds || []));
    const ownerId = req.user?.user_id || req.user?.id;

    if (!ownerId) {
      throw new Error('未找到用户信息');
    }

    if (!uniqueMemberIds.includes(ownerId)) {
      uniqueMemberIds.push(ownerId);
    }

    const groupId = uuidv4();

    await this.prisma.chat_group.create({
      data: {
        group_id: groupId,
        name: name.trim(),
        owner_id: ownerId,
        type: 2,
        status: 1,
      },
    });

    uniqueMemberIds.map((userId) =>
      this.prisma.chat_group_user.create({
        data: {
          group_id: groupId,
          user_id: userId,
          role: userId === ownerId ? 1 : 0,
        },
      }),
    );

    return {
      groupId,
      name: name.trim(),
    };
  }

  @Get('groups')
  @ApiBearerAuth()
  async listGroups(@Req() req: any) {
    const userId = req.user?.user_id || req.user?.id;
    if (!userId) {
      throw new Error('未找到用户信息');
    }

    const relations = await this.prisma.chat_group_user.findMany({
      where: { user_id: userId },
    });

    const groupIds = Array.from(new Set(relations.map((r) => r.group_id)));

    if (!groupIds.length) {
      return [];
    }

    const groups = await this.prisma.chat_group.findMany({
      where: {
        group_id: { in: groupIds },
        status: 1,
      },
    });

    return groups.map((g) => ({
      groupId: g.group_id,
      name: g.name,
    }));
  }

  @Get('groups/:groupId/members')
  @ApiBearerAuth()
  async getGroupMembers(@Req() req: any, @Param('groupId') groupId: string) {
    const userId = req.user?.user_id || req.user?.id;
    if (!userId) {
      throw new Error('未找到用户信息');
    }

    // 确认当前用户在该群中，避免越权查看
    const relation = await this.prisma.chat_group_user.findFirst({
      where: { user_id: userId, group_id: groupId },
    });

    if (!relation) {
      throw new Error('无权限查看该群成员');
    }

    const members = await this.prisma.chat_group_user.findMany({
      where: { group_id: groupId },
    });

    if (!members.length) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        user_id: { in: members.map((m) => m.user_id) },
      },
    });

    return users.map((u) => ({
      userId: u.user_id,
      firstName: u.first_name,
      lastName: u.last_name,
      phone: u.phone,
      email: u.email,
      avatar: u.avatar,
    }));
  }
}
