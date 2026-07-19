import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleTokenVerifier } from './google-token-verifier.service';
import { FacebookTokenVerifier } from './facebook-token-verifier.service';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwt.accessSecret'),
        signOptions: {
          expiresIn: (configService.get<string>('app.jwt.accessTtl') ||
            '15m') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleTokenVerifier,
    FacebookTokenVerifier,
  ],
  exports: [JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
