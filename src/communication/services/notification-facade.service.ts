import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Parent } from 'src/parents/entities/parent.entity';
import { School } from 'src/schools/entities/school.entity';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { StudentGuardian } from 'src/students/entities/student-guardian.entity';
import { User } from 'src/users/entities';
import { In, Repository } from 'typeorm';
import {
  NotificationDispatchPort,
  NotificationDispatchRequest,
  NotificationInboxPort,
  ParentNotificationItem,
} from '../contracts/notification-ports.contract';
import { DevicePlatform, DeviceToken } from '../entities/device-token.entity';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationFacadeService
  implements NotificationDispatchPort, NotificationInboxPort
{
  private readonly logger = new Logger(NotificationFacadeService.name);

  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(SchoolMember)
    private readonly schoolMemberRepository: Repository<SchoolMember>,
    @InjectRepository(StudentGuardian)
    private readonly guardianRepository: Repository<StudentGuardian>,
  ) {}

  async registerDeviceToken(input: {
    user: User;
    school: School;
    token: string;
    platform: DevicePlatform;
    provider?: string;
  }): Promise<void> {
    const existing = await this.deviceTokenRepository.findOne({
      where: {
        user: { pkid: input.user.pkid },
        school: { pkid: input.school.pkid },
        token: input.token,
      },
    });

    if (existing) {
      existing.platform = input.platform;
      existing.provider = input.provider ?? 'fcm';
      await this.deviceTokenRepository.save(existing);
      return;
    }

    const row = this.deviceTokenRepository.create({
      user: input.user,
      school: input.school,
      token: input.token,
      platform: input.platform,
      provider: input.provider ?? 'fcm',
    });
    await this.deviceTokenRepository.save(row);
  }

  async deregisterDeviceToken(input: {
    user: User;
    school: School;
    token?: string;
  }): Promise<{ removed: number }> {
    const qb = this.deviceTokenRepository
      .createQueryBuilder()
      .delete()
      .where('"user_id" = :userPkid', { userPkid: input.user.pkid })
      .andWhere('"school_id" = :schoolPkid', { schoolPkid: input.school.pkid });

    if (input.token) {
      qb.andWhere('"token" = :token', { token: input.token });
    }

    const result = await qb.execute();
    return { removed: result.affected ?? 0 };
  }

  async dispatch(input: NotificationDispatchRequest): Promise<void> {
    const recipients = await this.resolveRecipientUsers(input.userId, input.schoolId);
    if (!recipients.length) return;

    const notifications = recipients.map((user) =>
      this.notificationRepository.create({
        school: { id: input.schoolId } as School,
        user: { pkid: user.pkid } as User,
        type: input.type,
        title: input.title,
        body: input.body,
        relatedEntityId: input.relatedEntityId ?? null,
        isRead: false,
      }),
    );
    await this.notificationRepository.save(notifications);

    const userPkids = recipients.map((u) => u.pkid);
    const deviceTokens = await this.deviceTokenRepository.find({
      where: {
        school: { id: input.schoolId },
        user: { pkid: In(userPkids) },
      },
      relations: ['user'],
    });
    if (!deviceTokens.length) return;

    await Promise.allSettled(
      deviceTokens.map((token) => this.sendFcm(token, input)),
    );
  }

  async listForParent(
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
  }> {
    const qb = this.notificationRepository
      .createQueryBuilder('n')
      .innerJoin('n.user', 'user')
      .innerJoin('n.school', 'school')
      .where('user.id = :userId', { userId })
      .andWhere('school.id = :schoolId', { schoolId })
      .orderBy('n.isRead', 'ASC')
      .addOrderBy('n.createdAt', 'DESC');

    if (typeof isRead === 'boolean') {
      qb.andWhere('n.isRead = :isRead', { isRead });
    }

    const [rows, count] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const pages = Math.ceil(count / limit);

    return {
      items: rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        relatedEntityId: row.relatedEntityId,
        isRead: row.isRead,
        createdAt: row.createdAt.toISOString(),
      })),
      count,
      pages,
      previousPage: page > 1 ? page - 1 : null,
      page,
      nextPage: page < pages ? page + 1 : null,
      limit,
    };
  }

  async markRead(
    userId: string,
    schoolId: string,
    notificationId: string,
  ): Promise<{ id: string; isRead: true }> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where(
        `"id" = :notificationId
         AND "school_id" IN (SELECT "pkid" FROM "schools" WHERE "id" = :schoolId)
         AND "user_id" IN (SELECT "pkid" FROM "users" WHERE "id" = :userId)`,
        { notificationId, userId, schoolId },
      )
      .execute();

    if (!result.affected) {
      throw new NotFoundException('Notification not found.');
    }

    return { id: notificationId, isRead: true };
  }

  async markAllRead(userId: string, schoolId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where(
        `"user_id" IN (SELECT "pkid" FROM "users" WHERE "id" = :userId)
         AND "school_id" IN (SELECT "pkid" FROM "schools" WHERE "id" = :schoolId)
         AND "isRead" = false`,
        { userId, schoolId },
      )
      .execute();

    return { updated: result.affected ?? 0 };
  }

  private async resolveRecipientUsers(
    recipientId: string,
    schoolId: string,
  ): Promise<User[]> {
    const directUser = await this.userRepository.findOne({
      where: { id: recipientId },
    });
    if (directUser) {
      const [parentProfile, memberProfile] = await Promise.all([
        this.parentRepository.findOne({
          where: {
            user: { pkid: directUser.pkid },
            school: { id: schoolId },
          },
        }),
        this.schoolMemberRepository.findOne({
          where: {
            member: { pkid: directUser.pkid },
            school: { id: schoolId },
          },
        }),
      ]);

      if (parentProfile || memberProfile) {
        return [directUser];
      }
      return [];
    }

    const guardians = await this.guardianRepository.find({
      where: {
        student: {
          id: recipientId,
          school: { id: schoolId },
        },
      },
      relations: ['parent', 'parent.user'],
    });
    const userPkidSet = new Set<number>();
    const users: User[] = [];
    for (const guardian of guardians) {
      const user = guardian.parent?.user;
      if (user && !userPkidSet.has(user.pkid)) {
        userPkidSet.add(user.pkid);
        users.push(user);
      }
    }
    return users;
  }

  private async sendFcm(
    token: DeviceToken,
    input: NotificationDispatchRequest,
  ): Promise<void> {
    const serverKey = process.env.FCM_SERVER_KEY;
    if (!serverKey) {
      this.logger.warn('FCM_SERVER_KEY is not configured; skipping push send.');
      return;
    }

    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token.token,
          notification: {
            title: input.title,
            body: input.body,
          },
          data: input.data ?? {},
        }),
      });

      const body = (await response.json()) as {
        results?: Array<{ error?: string }>;
      };
      const errorCode = body.results?.[0]?.error;
      if (errorCode === 'InvalidRegistration' || errorCode === 'NotRegistered') {
        await this.deviceTokenRepository.delete({ pkid: token.pkid });
      }
    } catch (error) {
      this.logger.warn(
        `Failed push dispatch for token ${token.id}: ${String(error)}`,
      );
    }
  }
}
