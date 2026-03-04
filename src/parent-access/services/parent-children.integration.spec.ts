import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Parent } from 'src/parents/entities/parent.entity';
import { School } from 'src/schools/entities/school.entity';
import { User } from 'src/users/entities';
import { ParentChildrenService } from './parent-children.service';

describe('ParentChildrenService (integration)', () => {
  let service: ParentChildrenService;
  const parentRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentChildrenService,
        { provide: getRepositoryToken(Parent), useValue: parentRepo },
      ],
    }).compile();

    service = module.get(ParentChildrenService);
    jest.clearAllMocks();
  });

  it('parent can only read own linked children', async () => {
    parentRepo.findOne.mockResolvedValue({
      guardianships: [
        {
          student: { id: 'child-1', fullName: 'Child One', classroom: { name: 'Nursery A' } },
        },
      ],
    });

    const out = await service.getChildren({ pkid: 1 } as School, { pkid: 10 } as User);
    expect(out).toHaveLength(1);
    expect(out[0].studentId).toBe('child-1');
  });
});
