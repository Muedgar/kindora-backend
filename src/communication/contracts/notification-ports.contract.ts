export const NOTIFICATION_DISPATCH_PORT = 'NOTIFICATION_DISPATCH_PORT';
export const NOTIFICATION_INBOX_PORT = 'NOTIFICATION_INBOX_PORT';

export interface NotificationDispatchRequest {
  schoolId: string;
  userId: string;
  type: 'NEW_REPORT' | 'GOAL_MILESTONE' | 'SCHOOL_ANNOUNCEMENT';
  title: string;
  body: string;
  relatedEntityId?: string;
  data?: Record<string, string>;
}

export interface ParentNotificationItem {
  id: string;
  type: 'NEW_REPORT' | 'GOAL_MILESTONE' | 'SCHOOL_ANNOUNCEMENT';
  title: string;
  body: string;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationDispatchPort {
  dispatch(input: NotificationDispatchRequest): Promise<void>;
}

export interface NotificationInboxPort {
  listForParent(
    userId: string,
    schoolId: string,
    page: number,
    limit: number,
    isRead?: boolean,
  ): Promise<{
    items: ParentNotificationItem[];
    count: number;
    pages: number;
    previousPage: number | null;
    page: number;
    nextPage: number | null;
    limit: number;
  }>;
  markRead(
    userId: string,
    schoolId: string,
    notificationId: string,
  ): Promise<{ id: string; isRead: true }>;
  markAllRead(userId: string, schoolId: string): Promise<{ updated: number }>;
}
