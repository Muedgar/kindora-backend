import { Injectable } from '@nestjs/common';
import { CreateCheckinoutDto } from './dto/create-checkinout.dto';
import { UpdateCheckinoutDto } from './dto/update-checkinout.dto';

@Injectable()
export class CheckinoutService {
  create(createCheckinoutDto: CreateCheckinoutDto) {
    return 'This action adds a new checkinout';
  }

  findAll() {
    return `This action returns all checkinout`;
  }

  findOne(id: number) {
    return `This action returns a #${id} checkinout`;
  }

  update(id: number, updateCheckinoutDto: UpdateCheckinoutDto) {
    return `This action updates a #${id} checkinout`;
  }

  remove(id: number) {
    return `This action removes a #${id} checkinout`;
  }
}
