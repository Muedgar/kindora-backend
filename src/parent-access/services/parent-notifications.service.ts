import { Inject, Injectable } from '@nestjs/common';
import { User } from 'src/users/entities';
import {
  NOTIFICATION_INBOX_PORT,
  NotificationInboxPort,
} from 'src/communication/contracts/notification-ports.contract';
import { School } from 'src/schools/entities/school.entity';
import { ParentNotificationQueryDto } from '../dto/parent-notification-query.dto';

@Injectable()
export class ParentNotificationsService {
  constructor(
    @Inject(NOTIFICATION_INBOX_PORT)
    private readonly notificationInbox: NotificationInboxPort,
  ) {}

  list(user: User, school: School, query: ParentNotificationQueryDto) {
    return this.notificationInbox.listForParent(
      user.id,
      school.id,
      query.page ?? 1,
      query.limit ?? 20,
      query.isRead,
    );
  }

  markRead(user: User, school: School, id: string) {
    return this.notificationInbox.markRead(user.id, school.id, id);
  }

  markAllRead(user: User, school: School) {
    return this.notificationInbox.markAllRead(user.id, school.id);
  }
}
