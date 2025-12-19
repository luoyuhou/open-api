import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { FileEntity } from './entities/file.entity';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity]), PrismaModule],
  providers: [FileService],
  controllers: [FileController],
})
export class FileModule {}
