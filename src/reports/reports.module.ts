import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ActivitiesTemplate,
  Activity,
  DailyReport,
  GradingLevel,
} from './entities';
import { GradingLevelController } from './controllers/grading-level.controller';
import { GradingLevelService } from './services/grading-level.service';
import { UsersModule } from 'src/users/users.module';
import { ActivityService } from './services/activity.service';
import { ActivityController } from './controllers/activity.controller';
import { ActivityTemplateService } from './services/activity-template.service';
import { ActivitiesTemplateController } from './controllers/activity-template.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivitiesTemplate,
      Activity,
      DailyReport,
      GradingLevel,
    ]),
    UsersModule,
  ],
  controllers: [
    ActivitiesTemplateController,
    GradingLevelController,
    ActivityController,
  ],
  providers: [ActivityTemplateService, GradingLevelService, ActivityService],
})
export class ReportsModule {}
