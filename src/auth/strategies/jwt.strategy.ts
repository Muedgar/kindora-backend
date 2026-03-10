import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from 'src/users/entities';
import { Repository } from 'typeorm';
import { JwtPayload } from '../interfaces';
import { TOKEN_REVOKED, UNAUTHORIZED } from '../messages';
import { omit } from 'lodash';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('SECRET_KEY'),
    });
  }

  async validate(payload: JwtPayload): Promise<Omit<User, 'password'>> {
    // Look up by ID (stable) rather than email (can change in future).
    const user = await this.userRepository.findOne({ where: { id: payload.id } });

    if (!user || !user.status) {
      throw new UnauthorizedException(UNAUTHORIZED);
    }

    // Revocation check: if tokenVersion has been incremented since this token
    // was signed (password change, logout-all, account lock) — reject it.
    if (
      payload.tokenVersion !== undefined &&
      user.tokenVersion !== payload.tokenVersion
    ) {
      throw new UnauthorizedException(TOKEN_REVOKED);
    }

    return omit(user, ['password']) as Omit<User, 'password'>;
  }
}
