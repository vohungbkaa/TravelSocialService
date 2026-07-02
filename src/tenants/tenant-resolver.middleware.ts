import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantsService } from './tenants.service';

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(private readonly tenantsService: TenantsService) {}

  async use(request: Request, response: Response, next: NextFunction) {
    let role: string | undefined;
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payloadStr = Buffer.from(token.split('.')[1], 'base64').toString();
        const payload = JSON.parse(payloadStr);
        role = payload.role;
      } catch (e) {
        // Ignore token parse error
      }
    }

    const { RequestContext } = require('../database/prisma.service');
    RequestContext.run({ user: { role } }, async () => {
      try {
        (request as Request & { tenant?: unknown }).tenant =
          await this.tenantsService.resolveFromRequest(request);
        next();
      } catch (error) {
        next(error);
      }
    });
  }
}
