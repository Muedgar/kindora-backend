import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Parent } from 'src/parents/entities/parent.entity';
import { ReportSnapshot } from 'src/reports/entities/report-snapshot.entity';
import { SnapshotActivityItem } from 'src/reports/entities/snapshot-activity-item.entity';
import { School } from 'src/schools/entities/school.entity';
import { User } from 'src/users/entities';
import { DashboardCacheService } from './dashboard-cache.service';
import { ParentDashboardService } from './parent-dashboard.service';

describe('ParentDashboardService (integration)', () => {
  let service: ParentDashboardService;

  const parentRepo = { findOne: jest.fn() };
  const snapshotQb: Record<string, jest.Mock> = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const itemQb: Record<string, jest.Mock> = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const snapshotRepo = { createQueryBuilder: jest.fn(() => snapshotQb) };
  const itemRepo = { createQueryBuilder: jest.fn(() => itemQb) };
  const cache = { makeKey: jest.fn(), get: jest.fn(), set: jest.fn(), del: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentDashboardService,
        { provide: getRepositoryToken(Parent), useValue: parentRepo },
        { provide: getRepositoryToken(ReportSnapshot), useValue: snapshotRepo },
        { provide: getRepositoryToken(SnapshotActivityItem), useValue: itemRepo },
        { provide: DashboardCacheService, useValue: cache },
      ],
    }).compile();

    service = module.get(ParentDashboardService);
    jest.clearAllMocks();
  });

  it('returns contract and caches on miss; serves cache on hit', async () => {
    cache.makeKey.mockReturnValue('dashboard:student-1');
    cache.get.mockResolvedValueOnce(null).mockResolvedValueOnce({
      overall: 88,
      areas: [],
      activities: [],
      lastUpdated: '2026-03-03T00:00:00.000Z',
    });

    parentRepo.findOne.mockResolvedValue({ pkid: 101 });
    snapshotQb.getMany.mockResolvedValue([
      {
        pkid: 1,
        overallScore: 88,
        publishedAt: new Date('2026-03-03T00:00:00Z'),
        updatedAt: new Date('2026-03-03T00:00:00Z'),
      },
    ]);
    itemQb.getMany.mockResolvedValue([]);

    const first = await service.getDashboard(
      'student-1',
      {},
      { pkid: 1 } as School,
      { pkid: 10 } as User,
    );
    expect(first).toHaveProperty('overall');
    expect(first).toHaveProperty('areas');
    expect(first).toHaveProperty('activities');
    expect(first).toHaveProperty('lastUpdated');
    expect(cache.set).toHaveBeenCalled();

    const second = await service.getDashboard(
      'student-1',
      {},
      { pkid: 1 } as School,
      { pkid: 10 } as User,
    );
    expect(second.overall).toBe(88);
  });
});
