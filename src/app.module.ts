import { Module } from '@nestjs/common';
import { AppController } from "./controllers/app";
import { UsersController } from "./controllers/users";

import { AppService } from "./services/app";
import { UsersService } from "./services/users";

@Module({
  imports: [],
  controllers: [AppController, UsersController],
  providers: [AppService, UsersService],
})
export class AppModule {}
