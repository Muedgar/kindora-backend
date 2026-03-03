import { Inject, Injectable } from '@nestjs/common';
import { User } from 'src/users/entities';
import {
  NOTIFICATION_INBOX_PORT,
  NotificationInboxPort,
} from 'src/communication/contracts/notification-ports.contract';
import { ParentNotificationQueryDto } from '../dto/parent-notification-query.dto';

@Injectable()
export class ParentNotificationsService {
  constructor(
    @Inject(NOTIFICATION_INBOX_PORT)
    private readonly notificationInbox: NotificationInboxPort,
  ) {}

  list(user: User, query: ParentNotificationQueryDto) {
    return this.notificationInbox.listForParent(
      user.id,
      query.page ?? 1,
      query.limit ?? 20,
      query.isRead,
    );
  }

  markRead(user: User, id: string) {
    return this.notificationInbox.markRead(user.id, id);
  }

  markAllRead(user: User) {
    return this.notificationInbox.markAllRead(user.id);
  }
}
