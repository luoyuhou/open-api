import {
  BadRequestException,
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
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype?.startsWith('image/')) {
          return cb(new BadRequestException('仅支持上传图片文件'), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    const { hash, url } = await this.fileService.uploadFile(
      file.buffer,
      file.originalname,
    );
    return { hash, url: `http://${url}` };
  }
}
