import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationService } from './communication.service';
import { CommunicationController } from './communication.controller';
import {
  NOTIFICATION_DISPATCH_PORT,
  NOTIFICATION_INBOX_PORT,
} from './contracts/notification-ports.contract';
import { NotificationFacadeService } from './services/notification-facade.service';
import { NotificationEventBridgeService } from './services/notification-event-bridge.service';
import { DeviceToken } from './entities/device-token.entity';
import { Notification } from './entities/notification.entity';
import { User } from 'src/users/entities';
import { StudentGuardian } from 'src/students/entities/student-guardian.entity';
import { School } from 'src/schools/entities/school.entity';
import { Parent } from 'src/parents/entities/parent.entity';
import { SchoolMember } from 'src/schools/entities/school-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceToken,
      Notification,
      User,
      StudentGuardian,
      School,
      Parent,
      SchoolMember,
    ]),
  ],
  controllers: [CommunicationController],
  providers: [
    CommunicationService,
    NotificationFacadeService,
    NotificationEventBridgeService,
    {
      provide: NOTIFICATION_DISPATCH_PORT,
      useExisting: NotificationFacadeService,
    },
    {
      provide: NOTIFICATION_INBOX_PORT,
      useExisting: NotificationFacadeService,
    },
  ],
  exports: [
    NOTIFICATION_DISPATCH_PORT,
    NOTIFICATION_INBOX_PORT,
    NotificationFacadeService,
  ],
})
export class CommunicationModule {}
