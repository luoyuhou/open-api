import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { UserEntity } from '../users/entities/user.entity';
import { PublisherService } from './publisher.service';
import { PUBLISHER_MAX_IMAGE_BYTES } from './publisher.const';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { PublishArticleDto } from './dto/publish.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import {
  CreateAlqqCredentialDto,
  UpdateAlqqCredentialDto,
} from './dto/upsert-alqq-credential.dto';
import { CreatePublishPlatformDto } from './dto/create-publish-platform.dto';
import { UpdatePublishPlatformDto } from './dto/update-publish-platform.dto';

@UseGuards(SessionAuthGuard)
@Controller('publisher')
@ApiTags('publisher')
export class PublisherController {
  constructor(private readonly publisherService: PublisherService) {}

  @Get('meta/platforms')
  async listPlatforms() {
    const data = await this.publisherService.listPlatforms();
    return { message: 'ok', data };
  }

  @Get('admin/platforms')
  async listAdminPlatforms(@Req() req: Request) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.listAdminPlatforms(user);
    return { message: 'ok', data };
  }

  @Post('admin/platforms')
  async createAdminPlatform(
    @Req() req: Request,
    @Body() dto: CreatePublishPlatformDto,
  ) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.createAdminPlatform(user, dto);
    return { message: 'ok', data };
  }

  @Patch('admin/platforms/:id')
  async updateAdminPlatform(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdatePublishPlatformDto,
  ) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.updateAdminPlatform(user, id, dto);
    return { message: 'ok', data };
  }

  @Post('covers')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: PUBLISHER_MAX_IMAGE_BYTES },
    }),
  )
  async uploadCover(
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
    @Body('articleId') articleId?: string,
    @Body('replaceUrl') replaceUrl?: string,
  ) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.uploadCover(user, file, {
      articleId,
      replaceUrl,
    });
    return { message: 'ok', data };
  }

  @Get('articles')
  async listArticles(@Req() req: Request, @Query('status') status?: string) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.listArticles(user, status);
    return { message: 'ok', data };
  }

  @Get('articles/:id')
  async getArticle(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.getArticle(user, id);
    return { message: 'ok', data };
  }

  @Post('articles/:id/refresh')
  async refreshArticlePublish(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.refreshArticlePublish(user, id);
    return { message: 'ok', data };
  }

  @Post('articles/:id/sync-assets')
  async syncArticleAssets(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { cover?: string; content?: string },
  ) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.syncArticleMedia(
      user,
      id,
      body?.cover,
      body?.content,
    );
    return { message: 'ok', data };
  }

  @Post('articles')
  async createArticle(@Req() req: Request, @Body() dto: CreateArticleDto) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.createArticle(user, dto);
    return { message: 'ok', data };
  }

  @Put('articles/:id')
  async updateArticle(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.updateArticle(user, id, dto);
    return { message: 'ok', data };
  }

  @Delete('articles/:id')
  async deleteArticle(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.deleteArticle(user, id);
    return { message: 'ok', data };
  }

  @Get('alqq-credentials')
  async listAlqqCredentials(@Req() req: Request) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.listAlqqCredentials(user);
    return { message: 'ok', data };
  }

  @Post('alqq-credentials')
  async createAlqqCredential(
    @Req() req: Request,
    @Body() dto: CreateAlqqCredentialDto,
  ) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.createAlqqCredential(user, dto);
    return { message: 'ok', data };
  }

  @Put('alqq-credentials/:id')
  async updateAlqqCredential(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateAlqqCredentialDto,
  ) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.updateAlqqCredential(
      user,
      id,
      dto,
    );
    return { message: 'ok', data };
  }

  @Post('alqq-credentials/:id/default')
  async setDefaultAlqqCredential(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.setDefaultAlqqCredential(user, id);
    return { message: 'ok', data };
  }

  @Delete('alqq-credentials/:id')
  async deleteAlqqCredential(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.deleteAlqqCredential(user, id);
    return { message: 'ok', data };
  }

  @Get('accounts')
  async listAccounts(
    @Req() req: Request,
    @Query('credentialId') credentialId?: string,
  ) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.listAccounts(user, credentialId);
    return { message: 'ok', data };
  }

  @Get('accounts/:id')
  async getAccount(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.getAccount(user, id);
    return { message: 'ok', data };
  }

  @Post('accounts/:id/bind')
  async startBind(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.startBind(user, id);
    return { message: 'ok', data };
  }

  @Post('accounts/:id/bind/confirm')
  async confirmBind(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.confirmBind(user, id);
    return { message: 'ok', data };
  }

  @Post('accounts/:id/unbind')
  async unbindAccount(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.unbindAccount(user, id);
    return { message: 'ok', data };
  }

  @Patch('accounts/:id')
  async updateAccount(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.updateAccount(user, id, dto);
    return { message: 'ok', data };
  }

  @Get('jobs')
  async listJobs(@Req() req: Request) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.listJobs(user);
    return { message: 'ok', data };
  }

  @Get('jobs/:id')
  async getJob(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('refresh') refresh?: string,
  ) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.getJob(user, id, {
      refresh: refresh === '1' || refresh === 'true',
    });
    return { message: 'ok', data };
  }

  @Post('jobs/:id/refresh')
  async refreshJob(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.refreshJob(user, id);
    return { message: 'ok', data };
  }

  @Post('publish')
  async publish(@Req() req: Request, @Body() dto: PublishArticleDto) {
    const user = req.user as UserEntity;
    const data = await this.publisherService.publish(user, dto);
    return { message: 'ok', data };
  }
}
