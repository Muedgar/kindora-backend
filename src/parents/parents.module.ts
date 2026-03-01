import { Module } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { ParentsController } from './parents.controller';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from './entities/parent.entity';
import { SchoolsModule } from 'src/schools/school.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    CommonModule,TypeOrmModule.forFeature([Parent]), UsersModule, SchoolsModule],
  controllers: [ParentsController],
  providers: [ParentsService],
  exports: [ParentsService],
})
export class ParentsModule {}
