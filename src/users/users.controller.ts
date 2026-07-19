import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { TenantContext } from '../tenants/tenant-context.type';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UsersService } from './users.service';

interface AuthenticatedUser {
  userId: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  async getMyProfile(@CurrentUser() currentUser: AuthenticatedUser) {
    return { data: await this.usersService.getMyProfile(currentUser.userId) };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  async updateMyProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateMyProfileDto,
  ) {
    return {
      data: await this.usersService.updateMyProfile(currentUser.userId, dto),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List active users in the current tenant' })
  async findAll(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const result = await this.usersService.findAll(
      tenant,
      currentUser.userId,
      query,
    );
    return { data: result.items, meta: result.meta };
  }
}
