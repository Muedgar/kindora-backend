import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DailyReport } from 'src/reports/entities/daily-report.entity';
import { School } from 'src/schools/entities/school.entity';
import { User } from 'src/users/entities';
import { ParentTimelineService } from './parent-timeline.service';

describe('ParentTimelineService (integration)', () => {
  let service: ParentTimelineService;

  const qb: Record<string, jest.Mock> = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const reportRepo = {
    createQueryBuilder: jest.fn(() => qb),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentTimelineService,
        { provide: getRepositoryToken(DailyReport), useValue: reportRepo },
      ],
    }).compile();

    service = module.get(ParentTimelineService);
    jest.clearAllMocks();
  });

  it('returns cursor-paginated payload with nextCursor and stable order', async () => {
    qb.getMany.mockResolvedValue([
      {
        pkid: 12,
        id: 'r1',
        date: new Date('2026-03-03'),
        rawValue: 'A',
        normalisedScore: 90,
        comments: 'Good',
        visibleToParents: true,
        activity: {
          id: 'a1',
          name: 'Reading',
          gradingType: 'RUBRIC',
          learningAreas: [{ id: 'la1', name: 'Literacy' }],
        },
      },
      {
        pkid: 11,
        id: 'r2',
        date: new Date('2026-03-02'),
        rawValue: 'B',
        normalisedScore: 80,
        comments: null,
        visibleToParents: true,
        activity: {
          id: 'a1',
          name: 'Reading',
          gradingType: 'RUBRIC',
          learningAreas: [{ id: 'la1', name: 'Literacy' }],
        },
      },
      {
        pkid: 10,
        id: 'r3',
        date: new Date('2026-03-01'),
        rawValue: 'C',
        normalisedScore: 70,
        comments: null,
        visibleToParents: true,
        activity: {
          id: 'a1',
          name: 'Reading',
          gradingType: 'RUBRIC',
          learningAreas: [{ id: 'la1', name: 'Literacy' }],
        },
      },
    ]);

    const out = await service.getTimeline(
      'student-1',
      { pageSize: 2 },
      { pkid: 1 } as School,
      { id: 'u1' } as User,
    );

    expect(out.items).toHaveLength(2);
    expect(out.nextCursor).toBe('2026-03-02::11');
    expect(out.items[0].date > out.items[1].date).toBe(true);
  });
});
