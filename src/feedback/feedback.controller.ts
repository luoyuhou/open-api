import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { Pagination } from '../common/dto/pagination';
import { Request } from 'express';
import { UserEntity } from '../users/entities/user.entity';
import { CreateFeedbackCommentDto } from './dto/create-feedback-comment.dto';

@UseGuards(SessionAuthGuard)
@Controller('feedback')
@ApiTags('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateFeedbackDto) {
    const user = req.user as UserEntity;
    const data = await this.feedbackService.create(user, dto);
    return { message: 'ok', data };
  }

  @Post('pagination')
  @ApiProperty()
  async pagination(@Body() pagination: Pagination) {
    return this.feedbackService.pagination(pagination);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    const data = await this.feedbackService.updateStatus(id, dto);
    return { message: 'ok', data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const list = await this.feedbackService.pagination({
      pageNum: 0,
      pageSize: 1,
      sorted: [],
      filtered: [{ id: 'id', value: id }],
    } as unknown as Pagination);
    if (!list.data.length) {
      return { message: 'ok', data: null };
    }
    return { message: 'ok', data: list.data[0] };
  }

  @Get(':id/comments')
  async listComments(@Param('id', ParseIntPipe) id: number) {
    const data = await this.feedbackService.listComments(id);
    return { message: 'ok', data };
  }

  @Post(':id/comments')
  async createComment(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateFeedbackCommentDto,
  ) {
    const user = req.user as UserEntity;
    const data = await this.feedbackService.createComment(user, id, dto);
    return { message: 'ok', data };
  }
}
