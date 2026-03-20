import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import Env from './common/const/Env';
import { setup } from './app.setup';
import customLogger from './common/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Median')
    .setDescription('The Median API description')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  setup(app);

  await app.listen(Env.SERVER_PORT);

  customLogger.log({
    summary: 'Start service',
    message: `Application is running on: http://localhost:${Env.SERVER_PORT}`,
  });
}

// 捕获未处理的错误
process.on('unhandledRejection', (reason, promise) => {
  customLogger.error({
    summary: 'Unhandled Rejection',
    promise,
    reason,
  });
  // 不要退出进程，只记录错误
});

process.on('uncaughtException', (error) => {
  customLogger.error({
    summary: 'Uncaught Exception',
    error,
  });
  // 对于严重错误，给予清理时间后退出
  if (error.message.includes('ECONNRESET')) {
    customLogger.error({
      summary:
        'Connection reset error detected. Application will continue running.',
    });
  } else {
    setTimeout(() => process.exit(1), 1000);
  }
});

bootstrap();
