import { Controller, Get } from '@nestjs/common';
import { AppService } from "../services/app";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async healthCheck(): Promise<string> {
    return this.appService.healthCheck();
  }
}
