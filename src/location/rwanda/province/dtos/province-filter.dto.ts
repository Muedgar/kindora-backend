import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { ListFilterDTO } from 'src/common/dtos';

export class ProvinceFilterDto extends ListFilterDTO {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean({ message: 'Expected a boolean value.' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isDiaspora?: boolean;
}
