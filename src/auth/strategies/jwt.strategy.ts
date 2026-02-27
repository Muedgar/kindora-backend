import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from 'src/users/entities';
import { Repository } from 'typeorm';
import { JwtPayload } from '../interfaces';
import { UnauthorizedException } from '@nestjs/common';
import { UNAUTHORIZED } from '../messages';
import { omit } from 'lodash';

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

  async validate(payload: JwtPayload): Promise<Omit<User, 'password' | 'pkid'>> {
    const { email } = payload;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException(UNAUTHORIZED);
    }

    return omit(user, ['password', 'pkid']) as Omit<User, 'password' | 'pkid'>;
  }
}
