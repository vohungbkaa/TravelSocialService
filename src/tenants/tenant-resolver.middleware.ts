import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantsService } from './tenants.service';

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(private readonly tenantsService: TenantsService) {}

  async use(request: Request, response: Response, next: NextFunction) {
    try {
      (request as Request & { tenant?: unknown }).tenant =
        await this.tenantsService.resolveFromRequest(request);
      next();
    } catch (error) {
      next(error);
    }
  }
}
