import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync, sign } from 'node:crypto';
import { FacebookTokenVerifier } from './facebook-token-verifier.service';

describe('FacebookTokenVerifier', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects login when server credentials are not configured', async () => {
    const verifier = createVerifier({});

    await expect(verifier.verify('user-token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('verifies the app, user id and trusted Facebook profile', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            app_id: 'facebook-app-id',
            is_valid: true,
            user_id: 'facebook-user-id',
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'facebook-user-id',
          name: ' Facebook User ',
          email: 'FACEBOOK@EXAMPLE.COM',
          picture: { data: { url: 'https://example.com/avatar.jpg' } },
        }),
      );

    const profile = await createVerifier({
      'app.socialAuth.facebookAppId': 'facebook-app-id',
      'app.socialAuth.facebookAppSecret': 'facebook-app-secret',
    }).verify('facebook-user-token');

    expect(profile).toEqual({
      providerUserId: 'facebook-user-id',
      fullName: 'Facebook User',
      email: 'facebook@example.com',
      avatarUrl: 'https://example.com/avatar.jpg',
    });

    const debugUrl = fetchMock.mock.calls[0][0] as URL;
    expect(debugUrl.pathname).toBe('/debug_token');
    expect(debugUrl.searchParams.get('input_token')).toBe(
      'facebook-user-token',
    );
    expect(debugUrl.searchParams.get('access_token')).toBe(
      'facebook-app-id|facebook-app-secret',
    );

    const profileUrl = fetchMock.mock.calls[1][0] as URL;
    expect(profileUrl.pathname).toBe('/me');
    expect(profileUrl.searchParams.get('access_token')).toBe(
      'facebook-user-token',
    );
  });

  it('rejects a token issued for another Facebook app', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      jsonResponse({
        data: {
          app_id: 'another-app-id',
          is_valid: true,
          user_id: 'facebook-user-id',
        },
      }),
    );

    const verifier = createVerifier({
      'app.socialAuth.facebookAppId': 'facebook-app-id',
      'app.socialAuth.facebookAppSecret': 'facebook-app-secret',
    });

    await expect(verifier.verify('user-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('verifies a Facebook Limited Login JWT and its nonce', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const jwk = publicKey.export({ format: 'jwk' });
    const now = Math.floor(Date.now() / 1000);
    const token = createLimitedToken(
      {
        iss: 'https://www.facebook.com',
        aud: 'facebook-app-id',
        sub: 'limited-facebook-user-id',
        iat: now,
        exp: now + 3600,
        nonce: 'expected-nonce',
        name: 'Limited User',
        email: 'LIMITED@EXAMPLE.COM',
        picture: 'https://example.com/limited-avatar.jpg',
      },
      privateKey,
    );
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      jsonResponse({
        keys: [{ ...jwk, kid: 'facebook-key', alg: 'RS256', use: 'sig' }],
      }),
    );

    const profile = await createVerifier({
      'app.socialAuth.facebookAppId': 'facebook-app-id',
    }).verify(token, 'expected-nonce');

    expect(profile).toEqual({
      providerUserId: 'limited-facebook-user-id',
      fullName: 'Limited User',
      email: 'limited@example.com',
      avatarUrl: 'https://example.com/limited-avatar.jpg',
    });
  });

  it('rejects a Facebook Limited Login JWT with the wrong nonce', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const jwk = publicKey.export({ format: 'jwk' });
    const now = Math.floor(Date.now() / 1000);
    const token = createLimitedToken(
      {
        iss: 'https://www.facebook.com',
        aud: 'facebook-app-id',
        sub: 'limited-facebook-user-id',
        iat: now,
        exp: now + 3600,
        nonce: 'actual-nonce',
      },
      privateKey,
    );
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      jsonResponse({
        keys: [{ ...jwk, kid: 'facebook-key', alg: 'RS256', use: 'sig' }],
      }),
    );

    const verifier = createVerifier({
      'app.socialAuth.facebookAppId': 'facebook-app-id',
    });
    await expect(verifier.verify(token, 'wrong-nonce')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

function createLimitedToken(
  claims: object,
  privateKey: ReturnType<typeof generateKeyPairSync>['privateKey'],
) {
  const header = encodeJwtPart({ alg: 'RS256', kid: 'facebook-key' });
  const payload = encodeJwtPart(claims);
  const content = `${header}.${payload}`;
  const signature = sign('RSA-SHA256', Buffer.from(content), privateKey);
  return `${content}.${signature.toString('base64url')}`;
}

function encodeJwtPart(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createVerifier(config: Record<string, string>) {
  const configService = {
    get: jest.fn((key: string) => config[key]),
  } as unknown as ConfigService;
  return new FacebookTokenVerifier(configService);
}

function jsonResponse(body: object): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
