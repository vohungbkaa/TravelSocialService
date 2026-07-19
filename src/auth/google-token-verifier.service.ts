import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { SocialAuthProfile } from './social-auth-profile';

@Injectable()
export class GoogleTokenVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly configService: ConfigService) {}

  async verify(idToken: string): Promise<SocialAuthProfile> {
    const clientIds =
      this.configService.get<string[]>('app.socialAuth.googleClientIds') ?? [];
    if (clientIds.length === 0) {
      throw new ServiceUnavailableException('GOOGLE_AUTH_NOT_CONFIGURED');
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: clientIds,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) {
        throw new UnauthorizedException('INVALID_GOOGLE_TOKEN');
      }
      if (payload.email && payload.email_verified !== true) {
        throw new UnauthorizedException('GOOGLE_EMAIL_NOT_VERIFIED');
      }

      return {
        providerUserId: payload.sub,
        fullName: payload.name?.trim() || payload.email || 'Google User',
        ...(payload.email && { email: payload.email.toLowerCase() }),
        ...(payload.picture && { avatarUrl: payload.picture }),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('INVALID_GOOGLE_TOKEN');
    }
  }
}
