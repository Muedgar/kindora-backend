import { Test, TestingModule } from '@nestjs/testing';
import { CheckinoutController } from './checkinout.controller';
import { CheckinoutService } from './checkinout.service';

describe('CheckinoutController', () => {
  let controller: CheckinoutController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckinoutController],
      providers: [CheckinoutService],
    }).compile();

    controller = module.get<CheckinoutController>(CheckinoutController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
