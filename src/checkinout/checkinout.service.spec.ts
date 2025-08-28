import { Test, TestingModule } from '@nestjs/testing';
import { CheckinoutService } from './checkinout.service';

describe('CheckinoutService', () => {
  let service: CheckinoutService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CheckinoutService],
    }).compile();

    service = module.get<CheckinoutService>(CheckinoutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
