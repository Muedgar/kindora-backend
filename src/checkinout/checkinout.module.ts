import { Module } from '@nestjs/common';
import { CheckinoutService } from './checkinout.service';
import { CheckinoutController } from './checkinout.controller';

@Module({
  controllers: [CheckinoutController],
  providers: [CheckinoutService],
})
export class CheckinoutModule {}
