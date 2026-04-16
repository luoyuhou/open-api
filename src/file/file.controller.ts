import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileService } from './file.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { ApiTags } from '@nestjs/swagger';

@Controller('file')
@UseGuards(SessionAuthGuard)
@ApiTags('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  /**
   * 获取文件列表
   */
  @Get()
  async listFiles(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return await this.fileService.listFiles(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 10,
    );
  }

  /**
   * 删除文件
   */
  @Delete(':hash')
  async deleteFile(@Param('hash') hash: string) {
    return this.fileService.deleteFile(hash);
  }
}
