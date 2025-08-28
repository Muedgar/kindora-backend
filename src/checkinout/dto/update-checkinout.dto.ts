import { PartialType } from '@nestjs/swagger';
import { CreateCheckinoutDto } from './create-checkinout.dto';

export class UpdateCheckinoutDto extends PartialType(CreateCheckinoutDto) {}
