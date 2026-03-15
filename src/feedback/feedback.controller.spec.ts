import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { Request } from 'express';
import { UserEntity } from '../users/entities/user.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { Pagination } from '../common/dto/pagination';
import { CreateFeedbackCommentDto } from './dto/create-feedback-comment.dto';

describe('FeedbackController', () => {
  let controller: FeedbackController;
  let feedbackService: jest.Mocked<FeedbackService>;

  beforeEach(async () => {
    const mockFeedbackService = {
      create: jest.fn(),
      pagination: jest.fn(),
      updateStatus: jest.fn(),
      listComments: jest.fn(),
      createComment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [{ provide: FeedbackService, useValue: mockFeedbackService }],
    }).compile();

    controller = module.get<FeedbackController>(FeedbackController);
    feedbackService = module.get(
      FeedbackService,
    ) as jest.Mocked<FeedbackService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create feedback', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const createDto: CreateFeedbackDto = {
        title: 'Test',
        content: 'Test content',
      };
      const mockFeedback = { id: 1, title: 'Test' };
      feedbackService.create.mockResolvedValue(mockFeedback as any);

      const result = await controller.create(mockRequest, createDto, undefined);

      expect(feedbackService.create).toHaveBeenCalledWith(
        mockUser,
        createDto,
        undefined,
      );
      expect(result).toEqual({ message: 'ok', data: mockFeedback });
    });
  });

  describe('pagination', () => {
    it('should return paginated feedback list', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [{ id: 1 }], total: 1 };
      feedbackService.pagination.mockResolvedValue(mockResult as any);

      const result = await controller.pagination(pagination);

      expect(feedbackService.pagination).toHaveBeenCalledWith(pagination);
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateStatus', () => {
    it('should update feedback status', async () => {
      const id = 1;
      const dto: UpdateFeedbackStatusDto = { status: 1 };
      const mockFeedback = { id: 1, status: 'resolved' };
      feedbackService.updateStatus.mockResolvedValue(mockFeedback as any);

      const result = await controller.updateStatus(id, dto);

      expect(feedbackService.updateStatus).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual({ message: 'ok', data: mockFeedback });
    });
  });

  describe('findOne', () => {
    it('should return feedback by id', async () => {
      const id = 1;
      const mockFeedback = { id: 1, title: 'Test' };
      const mockResult = { data: [mockFeedback], total: 1 };
      feedbackService.pagination.mockResolvedValue(mockResult as any);

      const result = await controller.findOne(id);

      expect(feedbackService.pagination).toHaveBeenCalledWith({
        pageNum: 0,
        pageSize: 1,
        sorted: [],
        filtered: [{ id: 'id', value: id }],
      } as unknown as Pagination);
      expect(result).toEqual({ message: 'ok', data: mockFeedback });
    });

    it('should return null if feedback not found', async () => {
      const id = 999;
      const mockResult = { data: [], total: 0 };
      feedbackService.pagination.mockResolvedValue(mockResult as any);

      const result = await controller.findOne(id);

      expect(result).toEqual({ message: 'ok', data: null });
    });
  });

  describe('listComments', () => {
    it('should list feedback comments', async () => {
      const id = 1;
      const mockComments = [{ id: 1, content: 'Comment' }];
      feedbackService.listComments.mockResolvedValue(mockComments as any);

      const result = await controller.listComments(id);

      expect(feedbackService.listComments).toHaveBeenCalledWith(id);
      expect(result).toEqual({ message: 'ok', data: mockComments });
    });
  });

  describe('createComment', () => {
    it('should create feedback comment', async () => {
      const id = 1;
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto: CreateFeedbackCommentDto = { content: 'New comment' };
      const mockComment = { id: 1, content: 'New comment' };
      feedbackService.createComment.mockResolvedValue(mockComment as any);

      const result = await controller.createComment(mockRequest, id, dto);

      expect(feedbackService.createComment).toHaveBeenCalledWith(
        mockUser,
        id,
        dto,
      );
      expect(result).toEqual({ message: 'ok', data: mockComment });
    });
  });
});
