import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Env from '../common/const/Env';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super({ log: [Env.PRISMA_LOG_LEVEL] });
  }
}
