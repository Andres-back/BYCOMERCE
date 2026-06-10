import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async health() {
    const db = await this.prisma.$queryRaw`SELECT 1`
      .then(() => 'ok')
      .catch(() => 'down');

    return {
      status: db === 'ok' ? 'ok' : 'degraded',
      checks: {
        db,
      },
    };
  }
}

