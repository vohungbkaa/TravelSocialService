import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toPublicMediaUrl } from '../common/utils/media-url';
import { PrismaService } from '../database/prisma.service';
import type { TenantContext } from '../tenants/tenant-context.type';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

interface UserRow {
  id: string;
  username: string;
  email: string | null;
  fullName: string | null;
  avatarMediaId: string | null;
}

interface CountRow {
  count: bigint;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toMyProfileResponse(user);
  }

  async updateMyProfile(userId: string, dto: UpdateMyProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profileData = {
      ...(dto.fullName !== undefined && { fullName: dto.fullName }),
      ...(dto.bio !== undefined && { bio: dto.bio.trim() || null }),
      ...(dto.avatarUrl !== undefined && {
        avatarMediaId: dto.avatarUrl.trim() || null,
      }),
      ...(dto.coverUrl !== undefined && {
        coverMediaId: dto.coverUrl.trim() || null,
      }),
    };

    await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: dto.fullName || user.username,
        bio: dto.bio?.trim() || null,
        avatarMediaId: dto.avatarUrl?.trim() || null,
        coverMediaId: dto.coverUrl?.trim() || null,
      },
      update: profileData,
    });

    return this.getMyProfile(userId);
  }

  async findAll(
    tenant: TenantContext,
    currentUserId: string,
    query: ListUsersQueryDto,
  ) {
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const keyword = query.q?.trim();
    const search = keyword
      ? Prisma.sql`AND (
          unaccent(lower(COALESCE(profile."fullName", ''))) LIKE unaccent(lower(${`%${keyword}%`}))
          OR unaccent(lower(app_user."username")) LIKE unaccent(lower(${`%${keyword}%`}))
          OR unaccent(lower(COALESCE(app_user."email", ''))) LIKE unaccent(lower(${`%${keyword}%`}))
        )`
      : Prisma.empty;
    const currentUserFilter = query.includeCurrentUser
      ? Prisma.empty
      : Prisma.sql`AND app_user."id" <> ${currentUserId}`;

    const commonWhere = Prisma.sql`
      FROM "TenantUser" AS membership
      JOIN "User" AS app_user ON app_user."id" = membership."userId"
      LEFT JOIN "UserProfile" AS profile ON profile."userId" = app_user."id"
      WHERE membership."tenantId" = ${tenant.id}
        AND membership."active" = true
        AND app_user."status" = 'ACTIVE'
        ${currentUserFilter}
        ${search}
    `;

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<UserRow[]>(Prisma.sql`
        SELECT
          app_user."id",
          app_user."username",
          app_user."email",
          profile."fullName",
          profile."avatarMediaId"
        ${commonWhere}
        ORDER BY
          unaccent(lower(COALESCE(profile."fullName", app_user."username"))),
          app_user."id"
        LIMIT ${pageSize}
        OFFSET ${offset}
      `),
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        ${commonWhere}
      `),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return {
      items: rows.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || user.username,
        avatarUrl: toPublicMediaUrl(user.avatarMediaId),
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: offset + rows.length < total,
      },
    };
  }

  private toMyProfileResponse(user: {
    id: string;
    username: string;
    email: string | null;
    phone: string | null;
    role: string;
    createdAt: Date;
    profile: {
      fullName: string;
      bio: string | null;
      avatarMediaId: string | null;
      coverMediaId: string | null;
      postCount: number;
      followerCount: number;
      followingCount: number;
    } | null;
  }) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      fullName: user.profile?.fullName || user.username,
      bio: user.profile?.bio ?? null,
      avatarUrl: toPublicMediaUrl(user.profile?.avatarMediaId),
      coverUrl: toPublicMediaUrl(user.profile?.coverMediaId),
      postCount: user.profile?.postCount ?? 0,
      followerCount: user.profile?.followerCount ?? 0,
      followingCount: user.profile?.followingCount ?? 0,
      joinedAt: user.createdAt.toISOString(),
    };
  }
}
