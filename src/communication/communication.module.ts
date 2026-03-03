import { Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { CommunicationController } from './communication.controller';
import {
  NOTIFICATION_DISPATCH_PORT,
  NOTIFICATION_INBOX_PORT,
} from './contracts/notification-ports.contract';
import { NotificationFacadeService } from './services/notification-facade.service';

@Module({
  controllers: [CommunicationController],
  providers: [
    CommunicationService,
    NotificationFacadeService,
    {
      provide: NOTIFICATION_DISPATCH_PORT,
      useExisting: NotificationFacadeService,
    },
    {
      provide: NOTIFICATION_INBOX_PORT,
      useExisting: NotificationFacadeService,
    },
  ],
  exports: [NOTIFICATION_DISPATCH_PORT, NOTIFICATION_INBOX_PORT],
})
export class CommunicationModule {}
