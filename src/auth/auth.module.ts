import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities';
import { UsersModule } from 'src/users/users.module';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { JwtStrategy } from './strategies';
import { ReauthGuard } from './guards';
import { CommonModule } from 'src/common/common.module';
import { UserSession } from './entities/user-session.entity';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        // getOrThrow ensures the app fails fast at startup if SECRET_KEY is missing.
        secret: configService.getOrThrow<string>('SECRET_KEY'),
        // Default expiry for ad-hoc signs (e.g. invite tokens, reset tokens).
        // Access tokens are explicitly signed with expiresIn: '15m' in AuthService.
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, SchoolMember, UserSession]),
    UsersModule,
    CommonModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ReauthGuard],
})
export class AuthModule {}
