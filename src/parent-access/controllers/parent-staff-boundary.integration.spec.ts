import { readFileSync } from 'fs';
import { join } from 'path';

describe('Parent/Staff Dataset Boundary (integration)', () => {
  it('generic daily-report staff routes require write permission', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/reports/controllers/daily-report.controller.ts'),
      'utf8',
    );

    expect(source).toContain("@RequirePermission('write:daily-report')");
  });

  it('generic report-snapshot routes require write permission', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/reports/controllers/report-snapshot.controller.ts'),
      'utf8',
    );

    expect(source).toContain("@RequirePermission('write:report-snapshot')");
  });
});
