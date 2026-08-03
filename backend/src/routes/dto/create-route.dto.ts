import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { DocumentType, RouteDifficulty } from '@prisma/client';

export class CreateRouteDto {
  @IsString()
  @Length(1, 200)
  name!: string;

  @IsString()
  @Length(1, 200)
  region!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(RouteDifficulty)
  difficulty?: RouteDifficulty;

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(DocumentType, { each: true })
  requiredDocuments?: DocumentType[];

  @IsOptional()
  @IsInt()
  @Min(1)
  capacityPerDay?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minLeadTimeDays?: number;
}
