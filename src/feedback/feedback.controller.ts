import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { Pagination } from '../common/dto/pagination';
import { Request } from 'express';
import { UserEntity } from '../users/entities/user.entity';
import { CreateFeedbackCommentDto } from './dto/create-feedback-comment.dto';

const FEEDBACK_APP_TYPES = ['user', 'cashier', 'publisher'] as const;
type FeedbackAppType = typeof FEEDBACK_APP_TYPES[number];

function parseAppType(value?: string): FeedbackAppType | undefined {
  if (!value) return undefined;
  return FEEDBACK_APP_TYPES.includes(value as FeedbackAppType)
    ? (value as FeedbackAppType)
    : undefined;
}

@UseGuards(SessionAuthGuard)
@Controller('feedback')
@ApiTags('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  async create(
    @Req() req: Request,
    @Body() dto: CreateFeedbackDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const user = req.user as UserEntity;
    const data = await this.feedbackService.create(user, dto, files);
    return { message: 'ok', data };
  }

  @Post('pagination')
  @ApiProperty()
  async pagination(@Body() pagination: Pagination) {
    return this.feedbackService.pagination(pagination);
  }

  @Get('mine')
  async listMine(@Req() req: Request, @Query('appType') appType?: string) {
    const user = req.user as UserEntity;
    const data = await this.feedbackService.listMine(
      user,
      parseAppType(appType),
    );
    return { message: 'ok', data };
  }

  @Get('support-pending-count')
  async supportPendingCount(@Req() req: Request) {
    const user = req.user as UserEntity;
    const count = await this.feedbackService.countSupportPendingForDutyUser(
      user,
    );
    return { count };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    const data = await this.feedbackService.updateStatus(id, dto);
    return { message: 'ok', data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const list = await this.feedbackService.pagination({
      pageNum: 0,
      pageSize: 1,
      sorted: [],
      filtered: [{ id: 'feedback_id', value: id }],
    } as unknown as Pagination);
    if (!list.data.length) {
      return { message: 'ok', data: null };
    }
    return { message: 'ok', data: list.data[0] };
  }

  @Get(':id/comments')
  async listComments(@Param('id') id: string) {
    const data = await this.feedbackService.listComments(id);
    return { message: 'ok', data };
  }

  @Post(':id/comments')
  async createComment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateFeedbackCommentDto,
  ) {
    const user = req.user as UserEntity;
    const data = await this.feedbackService.createComment(user, id, dto);
    return { message: 'ok', data };
  }
}
