import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicKey,
  verify as verifySignature,
  type JsonWebKey,
} from 'node:crypto';
import { SocialAuthProfile } from './social-auth-profile';

const FACEBOOK_ISSUER = 'https://www.facebook.com';
const FACEBOOK_JWKS_URL =
  'https://www.facebook.com/.well-known/oauth/openid/jwks/';
const CLOCK_TOLERANCE_SECONDS = 300;

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

interface FacebookJwk extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

interface FacebookJwksResponse {
  keys?: FacebookJwk[];
}

interface LimitedTokenHeader {
  alg?: string;
  kid?: string;
}

interface LimitedTokenClaims {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  iat?: number;
  exp?: number;
  nonce?: string;
  name?: string;
  email?: string;
  picture?: string | FacebookProfileResponse['picture'];
}

@Injectable()
export class FacebookTokenVerifier {
  constructor(private readonly configService: ConfigService) {}

  async verify(
    accessToken: string,
    expectedNonce?: string,
  ): Promise<SocialAuthProfile> {
    const appId = this.configService.get<string>(
      'app.socialAuth.facebookAppId',
    );
    if (!appId) {
      throw new ServiceUnavailableException('FACEBOOK_AUTH_NOT_CONFIGURED');
    }

    if (this.isLimitedLoginToken(accessToken)) {
      return this.verifyLimitedToken(accessToken, appId, expectedNonce);
    }

    const appSecret = this.configService.get<string>(
      'app.socialAuth.facebookAppSecret',
    );
    if (!appSecret) {
      throw new ServiceUnavailableException('FACEBOOK_AUTH_NOT_CONFIGURED');
    }

    return this.verifyClassicToken(accessToken, appId, appSecret);
  }

  private async verifyClassicToken(
    accessToken: string,
    appId: string,
    appSecret: string,
  ): Promise<SocialAuthProfile> {
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

  private async verifyLimitedToken(
    token: string,
    appId: string,
    expectedNonce?: string,
  ): Promise<SocialAuthProfile> {
    try {
      const [encodedHeader, encodedPayload, encodedSignature] =
        token.split('.');
      const header = this.decodeJwtPart<LimitedTokenHeader>(encodedHeader);
      const claims = this.decodeJwtPart<LimitedTokenClaims>(encodedPayload);

      if (header.alg !== 'RS256' || !header.kid) {
        throw new UnauthorizedException('INVALID_FACEBOOK_TOKEN');
      }

      const jwksResponse = await fetch(FACEBOOK_JWKS_URL);
      if (!jwksResponse.ok) {
        throw new UnauthorizedException('INVALID_FACEBOOK_TOKEN');
      }
      const jwks = (await jwksResponse.json()) as FacebookJwksResponse;
      const jwk = jwks.keys?.find(
        (candidate) =>
          candidate.kid === header.kid &&
          (!candidate.alg || candidate.alg === 'RS256') &&
          (!candidate.use || candidate.use === 'sig'),
      );
      if (!jwk) {
        throw new UnauthorizedException('INVALID_FACEBOOK_TOKEN');
      }

      const signedContent = Buffer.from(`${encodedHeader}.${encodedPayload}`);
      const signature = Buffer.from(encodedSignature, 'base64url');
      const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
      if (!verifySignature('RSA-SHA256', signedContent, publicKey, signature)) {
        throw new UnauthorizedException('INVALID_FACEBOOK_TOKEN');
      }

      const now = Math.floor(Date.now() / 1000);
      const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (
        claims.iss !== FACEBOOK_ISSUER ||
        !audience.includes(appId) ||
        !claims.sub ||
        typeof claims.exp !== 'number' ||
        claims.exp <= now - CLOCK_TOLERANCE_SECONDS ||
        typeof claims.iat !== 'number' ||
        claims.iat > now + CLOCK_TOLERANCE_SECONDS ||
        !expectedNonce ||
        claims.nonce !== expectedNonce
      ) {
        throw new UnauthorizedException('INVALID_FACEBOOK_TOKEN');
      }

      const avatarUrl =
        typeof claims.picture === 'string'
          ? claims.picture
          : claims.picture?.data?.url;
      return {
        providerUserId: claims.sub,
        fullName: claims.name?.trim() || 'Facebook User',
        ...(claims.email && { email: claims.email.toLowerCase() }),
        ...(avatarUrl && { avatarUrl }),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('INVALID_FACEBOOK_TOKEN');
    }
  }

  private isLimitedLoginToken(token: string): boolean {
    return token.split('.').length === 3;
  }

  private decodeJwtPart<T>(part: string): T {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T;
  }
}
