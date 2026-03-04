import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  GOAL_MILESTONE_EVENT,
  GoalMilestonePayload,
  SNAPSHOT_SENT_EVENT,
  SnapshotPublishedPayload,
} from '../contracts/domain-events.contract';
import {
  NOTIFICATION_DISPATCH_PORT,
  NotificationDispatchPort,
} from '../contracts/notification-ports.contract';

/** Event bridge: translates domain events into notification dispatch calls. */
@Injectable()
export class NotificationEventBridgeService {
  constructor(
    @Inject(NOTIFICATION_DISPATCH_PORT)
    private readonly dispatch: NotificationDispatchPort,
  ) {}

  @OnEvent(SNAPSHOT_SENT_EVENT, { async: true })
  async onSnapshotSent(payload: SnapshotPublishedPayload): Promise<void> {
    await this.dispatch.dispatch({
      schoolId: payload.schoolId,
      userId: payload.studentId,
      type: 'NEW_REPORT',
      title: 'New report available',
      body: `${payload.studentName}'s report is ready.`,
      relatedEntityId: payload.snapshotId,
      data: { studentId: payload.studentId, snapshotId: payload.snapshotId },
    });
  }

  @OnEvent(GOAL_MILESTONE_EVENT, { async: true })
  async onGoalMilestone(payload: GoalMilestonePayload): Promise<void> {
    await this.dispatch.dispatch({
      schoolId: payload.schoolId,
      userId: payload.studentId,
      type: 'GOAL_MILESTONE',
      title: 'Goal milestone reached',
      body: payload.title,
      relatedEntityId: payload.goalId,
      data: { studentId: payload.studentId, goalId: payload.goalId },
    });
  }
}
