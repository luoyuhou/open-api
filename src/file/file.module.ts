import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileService } from './file.service';
import { FileEntity } from './entities/file.entity';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity]), PrismaModule],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
