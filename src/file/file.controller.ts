import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { Express } from 'express';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { ApiTags } from '@nestjs/swagger';

@UseGuards(SessionAuthGuard)
@Controller('file')
@ApiTags('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const { hash, url } = await this.fileService.uploadFile(
      file.buffer,
      file.originalname,
    );
    return { hash, url };
  }
}
