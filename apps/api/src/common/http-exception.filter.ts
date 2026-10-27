import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorResponse } from '@valunium/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    // Never log exception text, request bodies, headers, URLs or configuration values.
    if (status >= 500) this.logger.error(JSON.stringify({ event: 'http_error', status, requestId: response.locals.requestId }));
    const body: ApiErrorResponse = {
      error: {
        code: status >= 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`,
        message: status >= 500 ? 'Erro interno do servidor' : status === 404 ? 'Recurso não encontrado' : 'Requisição rejeitada',
      },
      requestId: response.locals.requestId as string,
    };
    response.status(status).json(body);
  }
}
