import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  SNAPSHOT_PUBLISHED_EVENT,
  SNAPSHOT_SENT_EVENT,
  SnapshotPublishedPayload,
} from 'src/communication/contracts/domain-events.contract';
import { DashboardCacheService } from './dashboard-cache.service';

@Injectable()
export class DashboardCacheInvalidatorService {
  private readonly logger = new Logger(DashboardCacheInvalidatorService.name);

  constructor(private readonly cache: DashboardCacheService) {}

  @OnEvent(SNAPSHOT_PUBLISHED_EVENT, { async: true })
  async onSnapshotPublished(payload: SnapshotPublishedPayload): Promise<void> {
    await this.invalidate(payload.studentId);
  }

  @OnEvent(SNAPSHOT_SENT_EVENT, { async: true })
  async onSnapshotSent(payload: SnapshotPublishedPayload): Promise<void> {
    await this.invalidate(payload.studentId);
  }

  private async invalidate(studentId: string): Promise<void> {
    const key = this.cache.makeKey(studentId);
    await this.cache.del(key);
    this.logger.debug(`Invalidated dashboard cache for student ${studentId}`);
  }
}
