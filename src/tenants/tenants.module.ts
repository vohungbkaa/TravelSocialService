import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantResolverMiddleware } from './tenant-resolver.middleware';
import { TenantAccessGuard } from './tenant-access.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [TenantsController],
  providers: [TenantsService, TenantResolverMiddleware, TenantAccessGuard],
  exports: [TenantsService, TenantResolverMiddleware, TenantAccessGuard],
})
export class TenantsModule {}
