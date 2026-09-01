import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class FindAuditLogQueryDto {
  // Not @IsEnum(...) against a fixed list — entityType is a free-form
  // string across every module (see AuditService.log() callers: 'application',
  // 'participant', 'permit', 'trek_route', ...), not a Prisma enum.
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
