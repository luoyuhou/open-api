import { Logger } from '@nestjs/common';
import rTracer = require('cls-rtracer');

class CustomLogger extends Logger {
  private getRequestId() {
    return rTracer.id();
  }

  constructor() {
    super();
  }

  log(output: Record<string, any>) {
    super.log(JSON.stringify({ ...output, requestId: this.getRequestId() }));
  }

  error(output: Record<string, any>, stack?: string) {
    super.error(
      JSON.stringify({ ...output, requestId: this.getRequestId() }),
      stack,
    );
  }

  warn(output: Record<string, any>, context?: string) {
    super.warn(
      JSON.stringify({ ...output, requestId: this.getRequestId() }),
      context,
    );
  }

  debug(output: Record<string, any>, context?: string) {
    super.debug(
      JSON.stringify({ ...output, requestId: this.getRequestId() }),
      context,
    );
  }
}

const customLogger = new CustomLogger();

export default customLogger;
