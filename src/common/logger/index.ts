import { Logger } from '@nestjs/common';

class CustomLogger extends Logger {
  constructor() {
    super();
  }
}

const customLogger = new CustomLogger();

export default customLogger;
