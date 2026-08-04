import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { RoutesModule } from './routes/routes.module';
import { ReferenceModule } from './reference/reference.module';
import { ApplicationsModule } from './applications/applications.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Default rate limit for every endpoint (per client IP): 60 requests / 60s.
    // Individual routes can tighten this further with @Throttle(...).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    PrismaModule,
    AuditModule,
    ReferenceModule,
    AuthModule,
    RoutesModule,
    ApplicationsModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
