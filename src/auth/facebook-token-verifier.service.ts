import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialAuthProfile } from './social-auth-profile';

interface FacebookDebugTokenResponse {
  data?: {
    app_id?: string;
    is_valid?: boolean;
    user_id?: string;
  };
}

interface FacebookProfileResponse {
  id?: string;
  name?: string;
  email?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

@Injectable()
export class FacebookTokenVerifier {
  constructor(private readonly configService: ConfigService) {}

  async verify(accessToken: string): Promise<SocialAuthProfile> {
    const appId = this.configService.get<string>(
      'app.socialAuth.facebookAppId',
    );
    const appSecret = this.configService.get<string>(
      'app.socialAuth.facebookAppSecret',
    );
    if (!appId || !appSecret) {
      throw new ServiceUnavailableException('FACEBOOK_AUTH_NOT_CONFIGURED');
    }

    const debugUrl = new URL('https://graph.facebook.com/debug_token');
    debugUrl.searchParams.set('input_token', accessToken);
    debugUrl.searchParams.set('access_token', `${appId}|${appSecret}`);

    try {
      const debugResponse = await fetch(debugUrl);
      if (!debugResponse.ok) {
        throw new UnauthorizedException('INVALID_FACEBOOK_TOKEN');
      }
      const debug = (await debugResponse.json()) as FacebookDebugTokenResponse;
      if (
        debug.data?.is_valid !== true ||
        debug.data.app_id !== appId ||
        !debug.data.user_id
      ) {
        throw new UnauthorizedException('INVALID_FACEBOOK_TOKEN');
      }

      const profileUrl = new URL('https://graph.facebook.com/me');
      profileUrl.searchParams.set(
        'fields',
        'id,name,email,picture.type(large)',
      );
      profileUrl.searchParams.set('access_token', accessToken);
      const profileResponse = await fetch(profileUrl);
      if (!profileResponse.ok) {
        throw new UnauthorizedException('INVALID_FACEBOOK_TOKEN');
      }
      const profile = (await profileResponse.json()) as FacebookProfileResponse;
      if (!profile.id || profile.id !== debug.data.user_id) {
        throw new UnauthorizedException('INVALID_FACEBOOK_TOKEN');
      }

      return {
        providerUserId: profile.id,
        fullName: profile.name?.trim() || 'Facebook User',
        ...(profile.email && { email: profile.email.toLowerCase() }),
        ...(profile.picture?.data?.url && {
          avatarUrl: profile.picture.data.url,
        }),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('INVALID_FACEBOOK_TOKEN');
    }
  }
}
