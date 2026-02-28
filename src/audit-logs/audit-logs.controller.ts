import {
  Controller,
  Get,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  SchoolContextGuard,
  PermissionGuard,
} from 'src/auth/guards';
import {
  GetSchoolContext,
  RequirePermission,
} from 'src/auth/decorators';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { SchoolContext } from 'src/auth/interfaces/school-context.interface';
import { AuditLogService } from 'src/common/services/audit-log.service';

@ApiTags('Audit Logs')
@ApiHeader({ name: 'X-School-Id', required: true })
@UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermission('read:audit-logs')
  @ResponseMessage('Audit logs fetched successfully')
  @ApiOperation({ summary: 'List audit logs for the current school (admin only)' })
  async findAll(
    @GetSchoolContext() ctx: SchoolContext,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const [logs, total] = await this.auditLogService.findAll(
      ctx.school.id,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
    return { logs, total };
  }
}
