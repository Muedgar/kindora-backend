import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from 'src/parents/entities/parent.entity';
import { StudentGuardian } from 'src/students/entities/student-guardian.entity';
import { ParentGuard } from 'src/auth/guards';
import { ParentsModule } from 'src/parents/parents.module';
import { ReportsModule } from 'src/reports/reports.module';
import { DailyReport } from 'src/reports/entities/daily-report.entity';
import { ReportSnapshot } from 'src/reports/entities/report-snapshot.entity';
import { SnapshotActivityItem } from 'src/reports/entities/snapshot-activity-item.entity';
import { CommunicationModule } from 'src/communication/communication.module';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { ParentChildrenController } from './controllers/parent-children.controller';
import { ParentTimelineController } from './controllers/parent-timeline.controller';
import { ParentReportsController } from './controllers/parent-reports.controller';
import { ParentDashboardController } from './controllers/parent-dashboard.controller';
import { ParentNotificationsController } from './controllers/parent-notifications.controller';
import { ParentChildrenService } from './services/parent-children.service';
import { ParentTimelineService } from './services/parent-timeline.service';
import { ParentReportsService } from './services/parent-reports.service';
import { ParentDashboardService } from './services/parent-dashboard.service';
import { DashboardCacheService } from './services/dashboard-cache.service';
import { DashboardCacheInvalidatorService } from './services/dashboard-cache-invalidator.service';
import { ParentNotificationsService } from './services/parent-notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Parent,
      StudentGuardian,
      DailyReport,
      ReportSnapshot,
      SnapshotActivityItem,
      SchoolMember,
    ]),
    ParentsModule,
    ReportsModule,
    CommunicationModule,
  ],
  controllers: [
    ParentChildrenController,
    ParentTimelineController,
    ParentReportsController,
    ParentDashboardController,
    ParentNotificationsController,
  ],
  providers: [
    ParentGuard,
    ParentChildrenService,
    ParentTimelineService,
    ParentReportsService,
    ParentDashboardService,
    ParentNotificationsService,
    DashboardCacheService,
    DashboardCacheInvalidatorService,
  ],
})
export class ParentAccessModule {}
