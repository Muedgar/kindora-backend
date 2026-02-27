import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ObjectLiteral, Repository } from 'typeorm';
import { Cell } from 'src/location/rwanda/cell/cell.entity';
import { District } from 'src/location/rwanda/district/district.entity';
import { Province } from 'src/location/rwanda/province/province.entity';
import { Sector } from 'src/location/rwanda/sector/sector.entity';
import { Village } from 'src/location/rwanda/village/village.entity';

const RWANDA_LOCATIONS_URL =
  'https://raw.githubusercontent.com/jnkindi/rwanda-locations-json/master/locations.json';

type FlatRecord = {
  province_code: number | string;
  province_name: string;
  district_code: number | string;
  district_name: string;
  sector_code: number | string;
  sector_name: string;
  cell_code: number | string;
  cell_name: string;
  village_code: number | string;
  village_name: string;
};

type NestedRecord = {
  province: string;
  districts: {
    district: string;
    sectors: {
      sector: string;
      cells: { cell: string; villages: string[] }[];
    }[];
  }[];
};

@Injectable()
export class RwandaLocationSeederService {
  private readonly logger = new Logger(RwandaLocationSeederService.name);
  private readonly datasetPath = join(
    process.cwd(),
    'src',
    'config',
    'seeds',
    'data',
    'rwanda-locations.json',
  );

  constructor(
    @InjectRepository(Province) private provinceRepo: Repository<Province>,
    @InjectRepository(District) private districtRepo: Repository<District>,
    @InjectRepository(Sector) private sectorRepo: Repository<Sector>,
    @InjectRepository(Cell) private cellRepo: Repository<Cell>,
    @InjectRepository(Village) private villageRepo: Repository<Village>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Seeding Rwanda location hierarchy...');

    const existingCount = await this.villageRepo.count();
    if (existingCount > 0) {
      this.logger.log(
        `Locations already present (${existingCount} villages). Skipping.`,
      );
      return;
    }

    const rows = await this.loadRows();

    const provincesByCode = new Map<string, { name: string }>();
    const districtsByCode = new Map<
      string,
      { name: string; provinceCode: string }
    >();
    const sectorsByCode = new Map<string, { name: string; districtCode: string }>();
    const cellsByCode = new Map<string, { name: string; sectorCode: string }>();
    const villagesByCode = new Map<string, { name: string; cellCode: string }>();

    for (const row of rows) {
      const provinceCode = this.code(row.province_code);
      const districtCode = this.code(row.district_code);
      const sectorCode = this.code(row.sector_code);
      const cellCode = this.code(row.cell_code);
      const villageCode = this.code(row.village_code);

      provincesByCode.set(provinceCode, { name: row.province_name.trim() });
      districtsByCode.set(districtCode, {
        name: row.district_name.trim(),
        provinceCode,
      });
      sectorsByCode.set(sectorCode, {
        name: row.sector_name.trim(),
        districtCode,
      });
      cellsByCode.set(cellCode, { name: row.cell_name.trim(), sectorCode });
      villagesByCode.set(villageCode, {
        name: row.village_name.trim(),
        cellCode,
      });
    }

    const provinceCodes = [...provincesByCode.keys()].sort();
    const savedProvinces = await this.provinceRepo.save(
      provinceCodes.map((key) =>
        this.provinceRepo.create({ name: provincesByCode.get(key)!.name }),
      ),
    );
    const provinceMap = new Map<string, Province>();
    provinceCodes.forEach((code, i) => provinceMap.set(code, savedProvinces[i]));

    const districtCodes = [...districtsByCode.keys()].sort();
    const savedDistricts = await this.districtRepo.save(
      districtCodes.map((key) =>
        this.districtRepo.create({
          name: districtsByCode.get(key)!.name,
          province: provinceMap.get(districtsByCode.get(key)!.provinceCode),
        }),
      ),
    );
    const districtMap = new Map<string, District>();
    districtCodes.forEach((code, i) => districtMap.set(code, savedDistricts[i]));

    const sectorCodes = [...sectorsByCode.keys()].sort();
    const savedSectors = await this.chunkSave(
      this.sectorRepo,
      sectorCodes.map((key) =>
        this.sectorRepo.create({
          name: sectorsByCode.get(key)!.name,
          district: districtMap.get(sectorsByCode.get(key)!.districtCode),
        }),
      ),
      500,
    );
    const sectorMap = new Map<string, Sector>();
    sectorCodes.forEach((code, i) => sectorMap.set(code, savedSectors[i]));

    const cellCodes = [...cellsByCode.keys()].sort();
    const savedCells = await this.chunkSave(
      this.cellRepo,
      cellCodes.map((key) =>
        this.cellRepo.create({
          name: cellsByCode.get(key)!.name,
          sector: sectorMap.get(cellsByCode.get(key)!.sectorCode),
        }),
      ),
      800,
    );
    const cellMap = new Map<string, Cell>();
    cellCodes.forEach((code, i) => cellMap.set(code, savedCells[i]));

    const villageCodes = [...villagesByCode.keys()].sort();
    await this.chunkSave(
      this.villageRepo,
      villageCodes.map((key) =>
        this.villageRepo.create({
          name: villagesByCode.get(key)!.name,
          cell: cellMap.get(villagesByCode.get(key)!.cellCode),
        }),
      ),
      1500,
    );

    this.logger.log(
      `Rwanda seed complete: ${provinceCodes.length} provinces, ${districtCodes.length} districts, ${sectorCodes.length} sectors, ${cellCodes.length} cells, ${villageCodes.length} villages.`,
    );
  }

  private code(value: number | string): string {
    return String(value).trim();
  }

  private async loadRows(): Promise<FlatRecord[]> {
    let raw = await this.loadOrDownloadDataset();
    let payload = JSON.parse(raw) as unknown;

    if (!Array.isArray(payload)) {
      throw new Error('Invalid Rwanda dataset payload: expected array.');
    }

    if (payload.length === 0) {
      this.logger.log(
        `Dataset file is empty at ${this.datasetPath}. Downloading latest copy...`,
      );
      raw = await this.downloadAndPersistDataset();
      payload = JSON.parse(raw) as unknown;
      if (!Array.isArray(payload) || payload.length === 0) {
        throw new Error('Downloaded Rwanda dataset is empty or invalid.');
      }
    }

    const first = payload[0] as Record<string, unknown>;
    if ('province_code' in first && 'village_code' in first) {
      return payload as FlatRecord[];
    }

    return this.flattenNested(payload as NestedRecord[]);
  }

  private flattenNested(data: NestedRecord[]): FlatRecord[] {
    const rows: FlatRecord[] = [];
    let provinceCode = 0;
    let districtCode = 0;
    let sectorCode = 0;
    let cellCode = 0;
    let villageCode = 0;

    for (const province of data) {
      provinceCode += 1;
      for (const district of province.districts ?? []) {
        districtCode += 1;
        for (const sector of district.sectors ?? []) {
          sectorCode += 1;
          for (const cell of sector.cells ?? []) {
            cellCode += 1;
            for (const village of cell.villages ?? []) {
              villageCode += 1;
              rows.push({
                province_code: provinceCode,
                province_name: province.province,
                district_code: districtCode,
                district_name: district.district,
                sector_code: sectorCode,
                sector_name: sector.sector,
                cell_code: cellCode,
                cell_name: cell.cell,
                village_code: villageCode,
                village_name: village,
              });
            }
          }
        }
      }
    }

    return rows;
  }

  private async loadOrDownloadDataset(): Promise<string> {
    try {
      return await readFile(this.datasetPath, 'utf8');
    } catch {
      return this.downloadAndPersistDataset();
    }
  }

  private async downloadAndPersistDataset(): Promise<string> {
    this.logger.log(
      `Local dataset missing. Downloading Rwanda dataset to ${this.datasetPath}`,
    );
    const response = await fetch(RWANDA_LOCATIONS_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to download dataset from ${RWANDA_LOCATIONS_URL} (HTTP ${response.status}).`,
      );
    }
    const content = await response.text();
    await mkdir(dirname(this.datasetPath), { recursive: true });
    await writeFile(this.datasetPath, content, 'utf8');
    return content;
  }

  private async chunkSave<T extends ObjectLiteral>(
    repo: Repository<T>,
    rows: T[],
    chunkSize: number,
  ): Promise<T[]> {
    const saved: T[] = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const inserted = await repo.save(chunk);
      saved.push(...inserted);
    }
    return saved;
  }
}
