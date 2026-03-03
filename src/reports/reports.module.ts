import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ActivitiesTemplate,
  Activity,
  DailyReport,
  GradingLevel,
  LearningArea,
  ReportSnapshot,
  SnapshotActivityItem,
  SnapshotReadReceipt,
} from './entities';
import { Student } from 'src/students/entities/student.entity';
import { StudentGuardian } from 'src/students/entities/student-guardian.entity';
import { Parent } from 'src/parents/entities/parent.entity';

// Controllers
import { GradingLevelController } from './controllers/grading-level.controller';
import { ActivityController } from './controllers/activity.controller';
import { ActivitiesTemplateController } from './controllers/activity-template.controller';
import { LearningAreaController } from './controllers/learning-area.controller';
import { DailyReportController } from './controllers/daily-report.controller';
import { ReportSnapshotController } from './controllers/report-snapshot.controller';

// Services
import { GradingLevelService } from './services/grading-level.service';
import { ActivityService } from './services/activity.service';
import { ActivityTemplateService } from './services/activity-template.service';
import { LearningAreaService } from './services/learning-area.service';
import { NormalisationService } from './services/normalisation.service';
import { DailyReportService } from './services/daily-report.service';
import { AggregationService } from './services/aggregation.service';
import { ReportSnapshotService } from './services/report-snapshot.service';
import { ReportSchedulerService } from './services/report-scheduler.service';

// Shared modules
import { UsersModule } from 'src/users/users.module';
import { SchoolsModule } from 'src/schools/school.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      ActivitiesTemplate,
      Activity,
      DailyReport,
      GradingLevel,
      LearningArea,
      // Phase 2
      Student,
      Parent,
      StudentGuardian,
      // Phase 3
      ReportSnapshot,
      SnapshotActivityItem,
      // Pre-Phase 4
      SnapshotReadReceipt,
    ]),
    UsersModule,
    SchoolsModule,
  ],
  controllers: [
    ActivitiesTemplateController,
    GradingLevelController,
    ActivityController,
    LearningAreaController,
    // Phase 2
    DailyReportController,
    // Phase 3
    ReportSnapshotController,
  ],
  providers: [
    // Core report services
    ActivityTemplateService,
    GradingLevelService,
    ActivityService,
    // Phase 1
    LearningAreaService,
    NormalisationService,
    // Phase 2
    DailyReportService,
    // Phase 3
    AggregationService,
    ReportSnapshotService,
    ReportSchedulerService,
  ],
  exports: [
    NormalisationService,
    ActivityService,
    DailyReportService,
    // Phase 3 — exported for potential use by future notification module
    ReportSnapshotService,
    AggregationService,
  ],
})
export class ReportsModule {}
