import { Injectable } from '@nestjs/common';
import {
  NotificationDispatchPort,
  NotificationDispatchRequest,
  NotificationInboxPort,
  ParentNotificationItem,
} from '../contracts/notification-ports.contract';

/**
 * Stub implementation for Phase 4/5 integration.
 * Real persistence + FCM/APNs fan-out will replace this class later without
 * changing parent-access controllers/services.
 */
@Injectable()
export class NotificationFacadeService
  implements NotificationDispatchPort, NotificationInboxPort
{
  async dispatch(_input: NotificationDispatchRequest): Promise<void> {
    // Deferred intentionally: communication implementation comes in Phase 5.
  }

  async listForParent(
    _userId: string,
    page: number,
    limit: number,
    _isRead?: boolean,
  ): Promise<{
    items: ParentNotificationItem[];
    count: number;
    pages: number;
    previousPage: number | null;
    page: number;
    nextPage: number | null;
    limit: number;
  }> {
    return {
      items: [],
      count: 0,
      pages: 0,
      previousPage: null,
      page,
      nextPage: null,
      limit,
    };
  }

  async markRead(
    _userId: string,
    notificationId: string,
  ): Promise<{ id: string; isRead: true }> {
    return { id: notificationId, isRead: true };
  }

  async markAllRead(_userId: string): Promise<{ updated: number }> {
    return { updated: 0 };
  }
}
