import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Pagination } from '../common/dto/pagination';
import {
  CreateFeedbackDto,
  FeedbackAttachmentDto,
} from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { UserEntity } from '../users/entities/user.entity';
import { CreateFeedbackCommentDto } from './dto/create-feedback-comment.dto';

@Injectable()
export class FeedbackService {
  private static readonly DAILY_FEEDBACK_LIMIT = 3;
  private static readonly MAX_ATTACHMENTS_PER_FEEDBACK = 5;

  constructor(private readonly prisma: PrismaService) {}

  private mapAttachmentType(type: FeedbackAttachmentDto['type']): number {
    if (type === 'image') return 1;
    if (type === 'video') return 2;
    return 0;
  }

  async create(user: UserEntity, dto: CreateFeedbackDto) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayCount = await this.prisma.user_feedback.count({
      where: {
        user_id: user.user_id,
        create_date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    if (todayCount >= FeedbackService.DAILY_FEEDBACK_LIMIT) {
      throw new BadRequestException('今日反馈次数已达上限，请明天再试');
    }

    if (
      dto.attachments &&
      dto.attachments.length > FeedbackService.MAX_ATTACHMENTS_PER_FEEDBACK
    ) {
      throw new BadRequestException(
        `单条反馈最多允许 ${FeedbackService.MAX_ATTACHMENTS_PER_FEEDBACK} 个附件`,
      );
    }

    const feedback = await this.prisma.user_feedback.create({
      data: {
        user_id: user.user_id,
        title: dto.title,
        content: dto.content,
        category: dto.category ?? null,
        status: 0,
      },
    });

    if (dto.attachments?.length) {
      await this.prisma.user_feedback_attachment.createMany({
        data: dto.attachments.map((att) => ({
          feedback_id: feedback.id,
          url: att.url,
          type: this.mapAttachmentType(att.type),
          description: att.description ?? null,
        })),
      });
    }

    return feedback;
  }

  async pagination(pagination: Pagination) {
    const { pageNum, pageSize, filtered } = pagination;
    const where: Record<string, unknown> = {};

    if (Array.isArray(filtered)) {
      filtered.forEach(({ id, value }) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value) && !value.length) return;
        if (id === 'status') {
          if (Array.isArray(value)) {
            where[id] = { in: value };
          } else {
            where[id] = value;
          }
          return;
        }
        if (Array.isArray(value)) {
          where[id] = { in: value };
          return;
        }
        where[id] = value;
      });
    }

    const count = await this.prisma.user_feedback.count({ where });
    const data = await this.prisma.user_feedback.findMany({
      where,
      take: pageSize,
      skip: pageNum * pageSize,
      orderBy: { create_date: 'desc' },
    });

    const ids = data.map((item) => item.id);
    const attachments = ids.length
      ? await this.prisma.user_feedback_attachment.findMany({
          where: { feedback_id: { in: ids } },
          orderBy: { id: 'asc' },
        })
      : [];

    const userIds = Array.from(new Set(data.map((item) => item.user_id)));
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { user_id: { in: userIds } },
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            phone: true,
            email: true,
          },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.user_id, u]));

    const list = data.map((item) => ({
      ...item,
      attachments: attachments.filter((att) => att.feedback_id === item.id),
      user: userMap.get(item.user_id) || null,
    }));

    return {
      data: list,
      rows: count,
      pages: Math.ceil(count / pageSize),
    };
  }

  async updateStatus(id: number, dto: UpdateFeedbackStatusDto) {
    const existed = await this.prisma.user_feedback.findUnique({
      where: { id },
    });
    if (!existed) {
      throw new NotFoundException('反馈不存在');
    }

    return this.prisma.user_feedback.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async listComments(feedbackId: number) {
    const comments = await this.prisma.user_feedback_comment.findMany({
      where: { feedback_id: feedbackId },
      orderBy: { create_date: 'asc' },
    });

    const userIds = Array.from(new Set(comments.map((c) => c.user_id)));
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { user_id: { in: userIds } },
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            phone: true,
            email: true,
          },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.user_id, u]));

    return comments.map((c) => ({
      ...c,
      user: userMap.get(c.user_id) || null,
    }));
  }

  async createComment(
    user: UserEntity,
    feedbackId: number,
    dto: CreateFeedbackCommentDto,
  ) {
    const existed = await this.prisma.user_feedback.findUnique({
      where: { id: feedbackId },
    });
    if (!existed) {
      throw new NotFoundException('反馈不存在');
    }

    if (dto.parent_id) {
      const parent = await this.prisma.user_feedback_comment.findUnique({
        where: { id: dto.parent_id },
      });
      if (!parent || parent.feedback_id !== feedbackId) {
        throw new NotFoundException('父评论不存在');
      }
    }

    const comment = await this.prisma.user_feedback_comment.create({
      data: {
        feedback_id: feedbackId,
        user_id: user.user_id,
        content: dto.content,
        parent_id: dto.parent_id ?? null,
      },
    });

    return comment;
  }
}
