import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Env from '../common/const/Env';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [Env.PRISMA_LOG_LEVEL],
      errorFormat: 'minimal',
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      // 禁用 WAL 模式，改回传统的单文件模式（DELETE），避免生成 -shm 和 -wal 临时文件
      await this.$queryRawUnsafe('PRAGMA journal_mode=DELETE;');
      this.logger.log(
        'Successfully connected to database and set journal_mode=DELETE',
      );
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Successfully disconnected from database');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
    }
  }
}
