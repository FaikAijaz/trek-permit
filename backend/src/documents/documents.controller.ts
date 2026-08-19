import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Document } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Controller('applications/:applicationId/participants/:participantId/documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(`Unsupported file type: ${file.mimetype}`),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  upload(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: JwtPayload,
  ): Promise<Document> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    return this.documentsService.upload(
      applicationId,
      participantId,
      dto.documentType,
      file,
      user.sub,
    );
  }

  // Owner or staff, same rule findOneForUser uses elsewhere — see
  // documents.service.ts's getFile() for why this isn't gated to the
  // draft/correction window the way upload() is.
  @Get(':documentId')
  async download(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, mimeType, filename } = await this.documentsService.getFile(
      applicationId,
      participantId,
      documentId,
      user.sub,
      user.role,
    );
    // "inline", not "attachment" — the dashboard opens this in a new tab to
    // display it, not to trigger a download prompt.
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    });
    return new StreamableFile(buffer);
  }
}
