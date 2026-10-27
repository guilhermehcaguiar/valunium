import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@valunium/shared';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return { data: { status: 'ok', service: 'valunium-api', version: 'v1' } };
  }
}
