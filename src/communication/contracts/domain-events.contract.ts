export const SNAPSHOT_PUBLISHED_EVENT = 'snapshot.published';
export const SNAPSHOT_SENT_EVENT = 'snapshot.sent';
export const GOAL_MILESTONE_EVENT = 'goal.milestone';

export interface SnapshotPublishedPayload {
  snapshotId: string;
  studentId: string;
  schoolId: string;
  studentName: string;
  periodStart: string;
  periodEnd: string;
}

export interface GoalMilestonePayload {
  goalId: string;
  studentId: string;
  schoolId: string;
  title: string;
  status: 'ACHIEVED';
  achievedAt: string;
}
