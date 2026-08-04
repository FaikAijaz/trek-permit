import { Module } from '@nestjs/common';
import { ApplicationsModule } from '../applications/applications.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';

@Module({
  imports: [ApplicationsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, StorageService],
})
export class DocumentsModule {}
