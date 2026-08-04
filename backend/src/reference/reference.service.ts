import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a reference like "APP-2026-000001". Atomic and race-safe:
   * concurrent callers for the same (year, entity) each get a distinct,
   * strictly increasing counter value from Postgres itself.
   */
  async generate(prefix: string, entity: string): Promise<string> {
    const year = new Date().getFullYear();

    const rows = await this.prisma.$queryRaw<{ counter: number }[]>`
      INSERT INTO reference_counters (year, entity, counter)
      VALUES (${year}, ${entity}, 1)
      ON CONFLICT (year, entity)
      DO UPDATE SET counter = reference_counters.counter + 1
      RETURNING counter;
    `;

    const counter = rows[0].counter;
    return `${prefix}-${year}-${counter.toString().padStart(6, '0')}`;
  }
}
