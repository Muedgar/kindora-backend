import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RolesModule } from 'src/roles/roles.module';
import { User } from './entities';
import { UserController } from './users.controller';
import { UserService } from './users.service';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { CommonModule } from 'src/common/common.module';
import { SchoolsModule } from 'src/schools/school.module';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { SchoolMemberRole } from 'src/schools/entities/school-member-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, SchoolMember, SchoolMemberRole]),
    RolesModule,
    CommonModule,
    SchoolsModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('SECRET_KEY'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UserController, MeController],
  providers: [UserService, MeService],
  exports: [UserService],
})
export class UsersModule {}
