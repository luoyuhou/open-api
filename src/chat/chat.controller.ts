import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
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

    await this.prisma.chat_group_user.createMany({
      data: uniqueMemberIds.map((userId) => ({
        group_id: groupId,
        user_id: userId,
        role: userId === ownerId ? 1 : 0,
      })),
      skipDuplicates: true,
    });

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
}
